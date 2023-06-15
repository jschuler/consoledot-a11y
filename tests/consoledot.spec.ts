import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  urls,
  context as defaultContext,
  prefix as defaultPrefix,
} from "./urls";
const fs = require("fs");
const getDirName = require("path").dirname;

test.describe.configure({ mode: "parallel" });

const results = [];

async function debounceDom(
  page,
  pollDelay = 2000,
  stableDelay = 350,
  maxTimeout = 30000
) {
  let markupPrevious = "";
  const timerStart = new Date();
  let isStable = false;
  while (!isStable) {
    const markupCurrent = await page.evaluate(() => document.body.innerHTML);
    const elapsed = new Date().getTime() - timerStart.getTime();
    if (markupCurrent == markupPrevious) {
      isStable = stableDelay <= elapsed;
    } else {
      markupPrevious = markupCurrent;
    }
    if (!isStable)
      if (elapsed > maxTimeout) {
        // max timeout escape hatch
        isStable = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, pollDelay));
      }
  }
}

interface URLConfig {
  url: string;
  onLoad?: (page: any) => Promise<void>;
  prefix?: string;
  context?: string;
}

// example to configure page actions before running aXe test
const customUrls: (string | URLConfig)[] = [
  {
    url: "https://demo.playwright.dev/todomvc",
    onLoad: async (page) => {
      // create a new todo locator
      const newTodo = page.getByPlaceholder("What needs to be done?");

      // Create one todo item.
      await newTodo.fill("buy some cheese");
      await newTodo.press("Enter");

      // Check that input is empty.
      await expect(newTodo).toBeEmpty();
    },
    context: null,
    prefix: "",
  },
];

// const allUrls = [...urls, ...customUrls];
const allUrls = [...urls];

test.describe("a11y testing", () => {
  for (var index = 0; index < allUrls.length; index++) {
    const entry: any = allUrls[index];
    let url;
    let onLoad;
    let prefix = defaultPrefix;
    let context = defaultContext;

    if (typeof entry === "object") {
      url = entry.url;
      onLoad = entry.onLoad;
      prefix = entry.prefix !== undefined ? entry.prefix : defaultPrefix;
      context = entry.context !== undefined ? entry.context : null;
    } else {
      url = entry;
    }

    const cleanedUrl = url
      .replace(/#.*/, "") // Remove after # (anchor links)
      .replace(/\/$/, ""); // Remove trailing /

    const fullUrl = `${prefix}${cleanedUrl}`;

    test(fullUrl, async ({ page }, testInfo) => {
      // navigate to the page
      await page.goto(fullUrl);
      // wait for it to load
      await debounceDom(page);
      // run any page specific actions
      if (onLoad) {
        await onLoad(page);
      }
      const screenshot = await page.screenshot({
        path: `screenshots/${cleanedUrl.replace("/", "_")}.png`,
      });
      await testInfo.attach("screenshot", {
        body: screenshot,
        contentType: "image/png",
      });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include(context)
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules([
          "color-contrast",
          "landmark-no-duplicate-main",
          "landmark-main-is-top-level",
          "scrollable-region-focusable",
        ])
        .options({
          reporter: "v2",
          // shouldn't have to specify these since chaining above, but there's a bug where it won't show in the output file otherwise
          rules: {
            "color-contrast": {
              enabled: false,
            },
            "landmark-no-duplicate-main": {
              enabled: false,
            },
            "landmark-main-is-top-level": {
              enabled: false,
            },
            "scrollable-region-focusable": {
              enabled: false,
            },
          },
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa"],
          },
        })
        .analyze();
      const axeReport = {
        ...accessibilityScanResults,
        custom: {
          screenshotFile: `${cleanedUrl.replace("/", "_")}.png`,
          context,
          index,
        },
        // if a redirect occurs, requested URL is different than final URL
        finalUrl: accessibilityScanResults.url,
        // the requested URL
        url: fullUrl,
      };
      const axeFileName = `axe/${cleanedUrl.replace("/", "_")}.json`;
      fs.mkdirSync(getDirName(axeFileName), { recursive: true });
      fs.writeFileSync(axeFileName, JSON.stringify(axeReport, null, 2));

      results.push({
        ...accessibilityScanResults,
        screenshotFile: `${cleanedUrl.replace("/", "_")}.png`,
      });

      await testInfo.attach("accessibility-scan-results", {
        body: JSON.stringify(accessibilityScanResults, null, 2),
        contentType: "application/json",
      });

      if (!process.env.SKIP_EXPECT) {
        expect(accessibilityScanResults.violations.length).toEqual(0);
      }
    });
  }
});
