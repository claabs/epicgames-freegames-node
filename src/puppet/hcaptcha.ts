import fs from 'fs-extra';
import { ElementHandle, Protocol } from 'puppeteer';
import puppeteer from '../common/puppeteer';
import { config } from '../common/config';
import L from '../common/logger';

const HCAPTCHA_ACCESSIBILITY_CACHE_FILE = './config/hcaptcha-accessibility-cache.json';

const CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

const getCookieCache = async (): Promise<Protocol.Network.Cookie[] | null> => {
  try {
    await fs.access(HCAPTCHA_ACCESSIBILITY_CACHE_FILE, fs.constants.O_RDWR);
    const cookieData: Protocol.Network.Cookie[] = await fs.readJSON(
      HCAPTCHA_ACCESSIBILITY_CACHE_FILE
    );
    const cookieExpiryString = cookieData.find((c) => c.name === 'hc_accessibility')?.expires;
    if (!cookieExpiryString) return null;
    if (new Date(cookieExpiryString * 1000).getTime() < Date.now() + CACHE_BUFFER_MS) return null;
    return cookieData;
  } catch (err) {
    return null;
  }
};

const setCookieCache = async (cookies: Protocol.Network.Cookie[]): Promise<void> => {
  await fs.writeJSON(HCAPTCHA_ACCESSIBILITY_CACHE_FILE, cookies);
};

export const getHcaptchaCookies = async (): Promise<Protocol.Network.Cookie[]> => {
  const { hcaptchaAccessibilityUrl } = config;
  if (!hcaptchaAccessibilityUrl) {
    L.warn('hcaptchaAccessibilityUrl not configured, captchas are less likely to be bypassed');
    return [];
  }
  let cookieData = await getCookieCache();
  if (!cookieData) {
    L.debug('Setting hCaptcha accessibility cookies');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    L.trace(`Navigating to ${hcaptchaAccessibilityUrl}`);
    await Promise.all([
      page.goto(hcaptchaAccessibilityUrl),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    L.trace(`Waiting for setAccessibilityCookie button`);
    const setCookieButton = (await page.waitForSelector(
      `button[data-cy='setAccessibilityCookie']:not([disabled])`
    )) as ElementHandle<HTMLButtonElement>;
    const portalUrl = await page.openPortal();
    L.info({ portalUrl });
    L.trace(`Clicking setAccessibilityCookie button`);
    await Promise.all([
      await setCookieButton.click({ delay: 100 }),
      await page.waitForSelector(`span[data-cy='fetchStatus']`),
    ]);

    await page.closePortal();
    L.trace(`Saving new cookies`);
    const cdpClient = await page.target().createCDPSession();
    const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
      cookies: Protocol.Network.Cookie[];
    };
    await browser.close();
    cookieData = currentUrlCookies.cookies;
    await setCookieCache(cookieData);
  }
  return cookieData;
};
