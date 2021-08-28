import fs from 'fs-extra';
import { Cookie } from 'puppeteer';
import puppeteer from '../common/puppeteer';
import { config } from '../common/config';
import L from '../common/logger';

const HCAPTCHA_ACCESSIBILITY_CACHE_FILE = './config/hcaptcha-accessibility-cache.json';

const CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

const getCookieCache = async (): Promise<Cookie[] | null> => {
  try {
    await fs.access(HCAPTCHA_ACCESSIBILITY_CACHE_FILE, fs.constants.O_RDWR);
    const cookieData: Cookie[] = await fs.readJSON(HCAPTCHA_ACCESSIBILITY_CACHE_FILE);
    const cookieExpiryString = cookieData.find(c => c.name === 'hc_accessibility')?.expires;
    if (!cookieExpiryString) return null;
    if (new Date(cookieExpiryString * 1000).getTime() < Date.now() + CACHE_BUFFER_MS) return null;
    return cookieData;
  } catch (err) {
    return null;
  }
};

const setCookieCache = async (cookies: Cookie[]): Promise<void> => {
  await fs.writeJSON(HCAPTCHA_ACCESSIBILITY_CACHE_FILE, cookies);
};

// eslint-disable-next-line import/prefer-default-export
export const getHcaptchaCookies = async (): Promise<Cookie[]> => {
  const { hcaptchaAccessibilityUrl } = config;
  if (!hcaptchaAccessibilityUrl) {
    L.debug('hcaptchaAccessibilityUrl not configured, captchas are less likely to be bypassed');
    return [];
  }
  let cookieData = await getCookieCache();
  if (!cookieData) {
    L.debug('Setting hCaptcha accessibility cookies');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const portalUrl = await page.openPortal();
    L.info({ portalUrl });
    L.trace(`Navigating to ${hcaptchaAccessibilityUrl}`);
    await Promise.all([page.goto(hcaptchaAccessibilityUrl), page.waitForNavigation()]);
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
    cookieData = currentUrlCookies.cookies;
    await setCookieCache(cookieData);
  }
  return cookieData;
};
