// global-setup.ts
import { chromium, FullConfig } from "@playwright/test";

const stuff = {
  user: process.env.SSO_USERNAME,
  pass: process.env.SSO_PASSWORD,
};

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL!);

  await page.waitForSelector("#rh-login");

  if (await page.waitForSelector("#truste-consent-button")) {
    await page.click("#truste-consent-button");
  }

  await page.waitForSelector("#username-verification");
  await page.type("#username-verification", stuff.user);
  await page.click("#login-show-step2");

  await page.waitForSelector("#password");
  await page.type("#password", stuff.pass);
  await page.click("#rh-password-verification-submit-button");
  await page.waitForNavigation();

  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
