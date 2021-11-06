import fs from 'fs-extra';
import { ElementHandle, Protocol } from 'puppeteer';
import path from 'path';
import puppeteer, { getDevtoolsUrl, launchArgs } from '../common/puppeteer';
import { config, CONFIG_DIR } from '../common/config';
import L from '../common/logger';

const HCAPTCHA_ACCESSIBILITY_CACHE_FILE = path.join(
  CONFIG_DIR,
  'hcaptcha-accessibility-cache.json'
);

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
    L.warn(
      'hcaptchaAccessibilityUrl not configured, captchas are less likely to be bypassed. Follow this guide to set it up: https://github.com/claabs/epicgames-freegames-node#hcaptcha-accessibility-cookies'
    );
    return [];
  }
  let cookieData = await getCookieCache();
  let browser;
  if (!cookieData) {
    try {
      L.debug('Setting hCaptcha accessibility cookies');
      browser = await puppeteer.launch(launchArgs);
      const page = await browser.newPage();

      L.trace(getDevtoolsUrl(page));
      L.trace(`Navigating to ${hcaptchaAccessibilityUrl}`);
      await Promise.all([
        page.goto(hcaptchaAccessibilityUrl),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);
      L.trace(`Waiting for setAccessibilityCookie button`);
      const setCookieButton = (await page.waitForSelector(
        `button[data-cy='setAccessibilityCookie']:not([disabled])`
      )) as ElementHandle<HTMLButtonElement>;
      L.trace(`Clicking setAccessibilityCookie button`);
      await setCookieButton.click({ delay: 100 });
      try {
        const getCookieResp = await page.waitForResponse(
          (res) =>
            res.url() === 'https://accounts.hcaptcha.com/accessibility/get_cookie' &&
            res.request().method() === 'POST'
        );
        const getCookieStatus = getCookieResp.status();
        if (getCookieStatus !== 200) {
          const errorBody = await getCookieResp.json();
          L.warn(
            { status: getCookieStatus, errorBody },
            'Error from hCaptcha get_cookie request, continuing without hCaptcha accessibility cookies'
          );
        }
      } catch (err) {
        L.debug(err);
        L.warn(
          'No get cookie response recieved, continuing without hCaptcha accessibility cookies'
        );
      }
      L.trace(`Saving new cookies`);
      const cdpClient = await page.target().createCDPSession();
      const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
        cookies: Protocol.Network.Cookie[];
      };
      await browser.close();
      cookieData = currentUrlCookies.cookies;
      await setCookieCache(cookieData);
    } catch (err) {
      L.warn(err);
      L.warn(
        'Setting the hCaptcha accessibility cookies encountered an error. Continuing without them...'
      );
      if (browser) await browser.close();
      return [];
    }
  }
  return cookieData;
};
