import fs from 'fs-extra';
import puppeteer, { puppeteerCookieToToughCookieFileStore } from '../common/puppeteer';
import { config } from '../common/config';
import L from '../common/logger';
import { mergeCookiesRaw, ToughCookieFileStore } from '../common/request';

const HCAPTCHA_ACCESSIBILITY_CACHE_FILE = './config/hcaptcha-accessibility-cache.json';

const CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

const getCookieCache = async (): Promise<ToughCookieFileStore | null> => {
  try {
    await fs.access(HCAPTCHA_ACCESSIBILITY_CACHE_FILE, fs.constants.O_RDWR);
    const cookieData: ToughCookieFileStore = await fs.readJSON(HCAPTCHA_ACCESSIBILITY_CACHE_FILE);
    const cookieExpiryString = cookieData?.['hcaptcha.com']?.['/']?.hc_accessibility?.expires;
    if (!cookieExpiryString) return null;
    if (new Date(cookieExpiryString).getTime() < Date.now() + CACHE_BUFFER_MS) return null;
    return cookieData;
  } catch (err) {
    return null;
  }
};

// eslint-disable-next-line import/prefer-default-export
export const setHcaptchaCookies = async (username: string): Promise<void> => {
  const { hcaptchaAccessibilityUrl } = config;
  if (!hcaptchaAccessibilityUrl) {
    L.debug('hcaptchaAccessibilityUrl not configured, captchas are less likely to be bypassed');
    return;
  }
  let cookieData = await getCookieCache();
  if (!cookieData) {
    // TODO: Check cache for existing valid token
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(hcaptchaAccessibilityUrl);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    const setCookieButton = await page.waitForSelector(
      'button[data-cy="setAccessibilityCookie"]:not([disabled])'
    );
    await setCookieButton.click();
    await page.waitForSelector('span[data-cy="fetchStatus"]');
    const currentUrlCookies = await page.cookies();
    cookieData = puppeteerCookieToToughCookieFileStore(currentUrlCookies);
  }
  await mergeCookiesRaw(username, cookieData);
};
