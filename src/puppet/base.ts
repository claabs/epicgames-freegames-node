import { Logger } from 'pino';
import { Protocol, Page, Browser } from 'puppeteer';
import path from 'path';
import logger from '../common/logger';
import {
  getDevtoolsUrl,
  safeLaunchBrowser,
  safeNewPage,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, setPuppeteerCookies } from '../common/cookie';
import { NotificationReason } from '../interfaces/notification-reason';
import { sendNotification } from '../notify';
import { config, CONFIG_DIR } from '../common/config';
import { getLocaltunnelUrl } from '../common/localtunnel';

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
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
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
      await page.screenshot({
        path: path.join(CONFIG_DIR, errorFile),
      });
      this.L.error(
        { errorFile },
        'Encountered an error during browser automation. Saved a screenshot for debugging purposes.'
      );
      await page.close();
    }
    throw err;
  }

  protected async openPortalAndNotify(page: Page, reason: NotificationReason): Promise<void> {
    let url = await page.openPortal();
    if (config.webPortalConfig?.localtunnel) {
      url = await getLocaltunnelUrl(url);
    }
    this.L.info({ url }, 'Go to this URL and do something');
    await sendNotification(url, this.email, reason);
  }
}
