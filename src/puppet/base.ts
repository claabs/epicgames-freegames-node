import { Logger } from 'pino';
import { Protocol, Page, Browser } from 'puppeteer';
import path from 'path';
import { ensureDir } from 'fs-extra';
import logger from '../common/logger';
import {
  getDevtoolsUrl,
  safeLaunchBrowser,
  safeNewPage,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, setPuppeteerCookies, userHasValidCookie } from '../common/cookie';
import { config } from '../common/config';
import { getAccountAuth } from '../common/device-auths';
import { STORE_HOMEPAGE } from '../common/constants';

export interface PuppetBaseProps {
  browser: Browser;
  email: string;
}

export default class PuppetBase {
  protected L: Logger;

  protected email: string;

  protected browser: Browser;

  constructor(props: PuppetBaseProps) {
    this.browser = props.browser;
    this.email = props.email;
    this.L = logger.child({
      user: this.email,
    });
  }

  protected async setupPage(): Promise<Page> {
    // Get cookies or latest access_token cookies
    let puppeteerCookies: Protocol.Network.CookieParam[] = [];
    if (userHasValidCookie(this.email, 'EPIC_BEARER_TOKEN')) {
      this.L.debug('Setting auth from cookies');
      const userCookies = await getCookiesRaw(this.email);
      puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    } else {
      const deviceAuth = getAccountAuth(this.email);
      if (!deviceAuth) throw new Error(`Unable to get auth for user ${this.email}`);
      this.L.debug({ deviceAuth }, 'Setting auth from device auth');
      const bearerCookies: Protocol.Network.CookieParam[] = [
        '.epicgames.com',
        '.twinmotion.com',
        '.fortnite.com',
        '.unrealengine.com',
      ].map((domain) => ({
        name: 'EPIC_BEARER_TOKEN',
        value: deviceAuth.access_token,
        expires: new Date(deviceAuth.expires_at).getTime() / 1000,
        domain,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      }));
      puppeteerCookies.push(...bearerCookies);
    }
    this.L.debug('Logging in with puppeteer');
    const browser = await safeLaunchBrowser(this.L);
    const page = await safeNewPage(browser, this.L);
    try {
      this.L.trace(getDevtoolsUrl(page));
      const cdpClient = await page.target().createCDPSession();
      await cdpClient.send('Network.setCookies', {
        cookies: puppeteerCookies,
      });
      await cdpClient.detach();
      await page.setCookie(...puppeteerCookies);
      await page.goto(STORE_HOMEPAGE, { waitUntil: 'networkidle2' });
      return page;
    } catch (err) {
      await this.handlePageError(err, page);
      throw err;
    }
  }

  protected async teardownPage(page: Page): Promise<void> {
    try {
      this.L.trace('Saving new cookies');
      const cdpClient = await page.target().createCDPSession();
      const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
        cookies: Protocol.Network.Cookie[];
      };
      setPuppeteerCookies(this.email, currentUrlCookies.cookies);
      this.L.trace('Saved cookies, closing browser');
      await page.close();
    } catch (err) {
      await this.handlePageError(err, page);
    }
  }

  protected async handlePageError(err: unknown, page?: Page) {
    if (page) {
      const errorFile = `error-${new Date().toISOString()}.png`;
      await ensureDir(config.errorsDir);
      await page.screenshot({
        path: path.join(config.errorsDir, errorFile),
      });
      this.L.error(
        { errorFile },
        'Encountered an error during browser automation. Saved a screenshot for debugging purposes.'
      );
      await page.close();
    }
    throw err;
  }
}
