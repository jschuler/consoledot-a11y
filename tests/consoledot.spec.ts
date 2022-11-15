import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const fs = require("fs");
const path = require("path");
const getDirName = require("path").dirname;

test.describe.configure({ mode: "parallel" });

async function waitFor(page) {
  // there should be no loading states
  await expect.soft(page.locator(".pf-c-spinner")).toHaveCount(0);
  await expect.soft(page.locator(".ins-c-spinner")).toHaveCount(0);
  await expect.soft(page.locator("[class*='skeleton']")).toHaveCount(0);
}

const stuff = {
  prefix: "https://console.redhat.com/beta",
  urls: [
    "/application-services/overview",
    "/application-services/streams/kafkas",
    "/application-services/streams/service-accounts",
    // [
    //   "/application-services/streams/resources",
    //   [(context) => context.getByText("Resources")],
    // ],
    // "/application-services/api-management",
    // "/application-services/data-science",
    // "/openshift",
    // "/openshift/overview",
    // "/openshift/releases",
    // "/openshift/subscriptions/openshift-container",
    // [
    //   "/openshift/quota",
    //   [
    //     // (page) => page.getByText("Dedicated (Annual)").waitFor(),
    //     (context) => context.locator("h1", { hasText: "Dedicated (Annual)" }),
    //   ],
    // ],
    // "/openshift/subscriptions/openshift-dedicated",
    // "/openshift/quota/resource-limits",
    // // "/openshift/cost-management",
    // "/openshift/cost-management/ocp",
    // "/openshift/cost-management/aws",
    // "/openshift/cost-management/azure",
    // "/openshift/cost-management/gcp",
    // "/openshift/cost-management/cost-models",
    // "/openshift/cost-management/cost-explorer",
    // "/insights/dashboard",
    // "/insights/advisor/recommendations",
    // "/insights/advisor/systems",
    // "/insights/advisor/topics",
    // "/insights/drift/comparison",
    // "/insights/drift/baselines",
    // "/insights/inventory",
    // "/insights/vulnerability/cves",
    // "/insights/vulnerability/reports",
    // "/insights/vulnerability/systems",
    // "/insights/compliance/reports",
    // "/insights/compliance/scappolicies",
    // "/insights/compliance/systems",
    // "/insights/patch/advisories",
    // "/insights/patch/systems",
    // "/insights/patch/packages",
    // "/insights/subscriptions/rhel",
    // "/insights/subscriptions/rhel-arm",
    // "/insights/subscriptions/rhel-ibmpower",
    // "/insights/subscriptions/rhel-ibmz",
    // "/insights/subscriptions/rhel-86",
    // "/insights/registration",
    // "/insights/remediations",
    // "/docs/api",
    // [
    //   "/ansible/automation-hub",
    //   [(page) => page.getByText("Collections").waitFor()],
    // ],
    // [
    //   "/ansible/automation-hub/partners",
    //   [(page) => page.getByText("Partners").waitFor()],
    // ],
    // [
    //   "/ansible/automation-hub/my-namespaces",
    //   [(page) => page.getByText("My namespaces").waitFor()],
    // ],
    // [
    //   "/ansible/automation-hub/repositories",
    //   [(page) => page.getByText("Repo Management").waitFor()],
    // ],
    // [
    //   "/ansible/automation-hub/token",
    //   [(page) => page.getByText("Connect to Hub").waitFor()],
    // ],
    // // "/ansible/catalog/products",
    // // "/ansible/catalog/portfolios",
    // // "/ansible/catalog/platforms",
    // // "/ansible/catalog/order-processes",
    // // "/ansible/catalog/orders",
    // // "/ansible/catalog/approval",
    // // "/ansible/automation-analytics/reports/automation_calculator",
    // // "/ansible/automation-analytics/organization-statistics",
    // // "/ansible/automation-analytics/job-explorer",
    // // "/ansible/automation-analytics/clusters",
    // // "/ansible/automation-analytics/notifications",
    // "/settings/my-user-access",
    // "/settings/rbac/users",
    // "/settings/rbac/roles",
    // "/settings/rbac/groups",
    // "/settings/sources",
    // "/settings/integrations",
    // "/settings/notifications/rhel",
    // "/settings/connector",
    // "/settings/applications/advisor",
    // "/settings/application/cost-management",
    // "/user-preferences/email",
    // "/user-preferences/notifications/rhel",
  ],
};

for (const url of stuff.urls) {
  let pageUrl;

  if (Array.isArray(url)) {
    pageUrl = url[0];
  } else {
    pageUrl = url;
  }
  test(`a11y testing ${pageUrl}`, async ({ page }, testInfo) => {
    let locators = [];
    if (Array.isArray(url)) {
      locators = locators.concat((url as any[])[1]);
    }
    await page.goto(`${stuff.prefix}${pageUrl}`);

    // context
    const defaultLocator = await page.locator(
      "#chrome-app-render-root .chr-scope__default-layout"
    );
    await defaultLocator.waitFor();

    // route specific loading
    locators.forEach(async (locator: any) => {
      await locator(defaultLocator).waitFor();
    });

    // loading spinners
    await waitFor(page);

    const screenshot = await page.screenshot({
      path: `screenshots/${pageUrl.replace("/", "_")}.png`,
    });
    await testInfo.attach("screenshot", {
      body: screenshot,
      contentType: "image/png",
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("#chrome-app-render-root .chr-scope__default-layout")
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .options({
        reporter: "v2",
      })
      .analyze();
    const axeReport = {
      [pageUrl]: {
        ...accessibilityScanResults,
        screenshotFile: `${pageUrl.replace("/", "_")}.png`,
      },
    };
    const axeFileName = `axe/${pageUrl.replace("/", "_")}.json`;
    fs.mkdirSync(getDirName(axeFileName), { recursive: true });
    fs.writeFileSync(
      axeFileName,
      JSON.stringify(axeReport, null, 2)
    );

    await testInfo.attach("accessibility-scan-results", {
      body: JSON.stringify(accessibilityScanResults, null, 2),
      contentType: "application/json",
    });
    // expect(accessibilityScanResults.violations).toEqual([]);
  });
}
