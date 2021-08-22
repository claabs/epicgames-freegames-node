import fs from 'fs-extra';
import { Cookie } from 'puppeteer';
import puppeteer, { puppeteerCookieToToughCookieFileStore } from '../common/puppeteer';
import { config } from '../common/config';
import logger from '../common/logger';
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

const setCookieCache = async (cookies: ToughCookieFileStore): Promise<void> => {
  await fs.writeJSON(HCAPTCHA_ACCESSIBILITY_CACHE_FILE, cookies);
};

// eslint-disable-next-line import/prefer-default-export
export const setHcaptchaCookies = async (email: string): Promise<void> => {
  const L = logger.child({ email });
  const { hcaptchaAccessibilityUrl } = config;
  if (!hcaptchaAccessibilityUrl) {
    L.debug('hcaptchaAccessibilityUrl not configured, captchas are less likely to be bypassed');
    return;
  }
  let cookieData = await getCookieCache();
  if (!cookieData) {
    L.debug('Setting hCaptcha accessibility cookies');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const portalUrl = await page.openPortal();
    L.info({ portalUrl });
    L.trace(`Navigating to ${hcaptchaAccessibilityUrl}`);
    await page.goto(hcaptchaAccessibilityUrl);
    L.trace(`Waiting for setAccessibilityCookie button`);
    const setCookieButton = await page.waitForSelector(
      `button[data-cy='setAccessibilityCookie']:not([disabled])`
    );
    L.trace(`Clicking setAccessibilityCookie button`);
    await Promise.all([
      await setCookieButton.click({ delay: 100 }),
      await page.waitForSelector(`span[data-cy='fetchStatus']`),
    ]);

    await page.closePortal();
    L.trace(`Saving new cookies`);
    // eslint-disable-next-line no-underscore-dangle,@typescript-eslint/no-explicit-any
    const currentUrlCookies: { cookies: Cookie[] } = await (page as any)._client.send(
      'Network.getAllCookies'
    );
    await browser.close();
    cookieData = puppeteerCookieToToughCookieFileStore(currentUrlCookies.cookies);
    await setCookieCache(cookieData);
  }
  await mergeCookiesRaw(email, cookieData);
};
