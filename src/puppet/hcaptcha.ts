import puppeteer from '../common/puppeteer';
import { config } from '../common/config';
import L from '../common/logger';

// eslint-disable-next-line import/prefer-default-export
export const setHcaptchaCookies = async (username: string): Promise<void> => {
  const { hcaptchaAccessibilityUrl } = config;
  if (!hcaptchaAccessibilityUrl) {
    L.debug('hcaptchaAccessibilityUrl not configured, captchas are less likely to be bypassed');
    return;
  }
  // TODO: Check cache for existing valid token
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(hcaptchaAccessibilityUrl);
  // TODO: Apply cookies to username cookie jar
};
