import { Logger } from 'pino';
import { Protocol, Page, Browser, HTTPRequest } from 'puppeteer';
import path from 'path';
import { getRedemptionToken } from 'privacy-pass-redeemer';
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
import { getHcaptchaPrivacyPassToken } from '../common/privacypass';
import { getHcaptchaCookies } from './hcaptcha';

export interface PuppetBaseProps {
  browser: Browser;
  email: string;
}

const SPEND_REGEX = /^https:\/\/(.+\\.)*hcaptcha.com\/getcaptcha\/(.*)$/;
const NON_SPEND_HCAPTCHA_URLS = [
  'https://hcaptcha.com/getcaptcha/00000000-0000-0000-0000-000000000000',
  'https://hcaptcha.com/getcaptcha/10000000-ffff-ffff-ffff-000000000001',
  'https://hcaptcha.com/getcaptcha/20000000-ffff-ffff-ffff-000000000002',
  'https://hcaptcha.com/getcaptcha/30000000-ffff-ffff-ffff-000000000003',
];

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
    const hcaptchaAccessiblityCookies = await getHcaptchaCookies();
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
      await page.setCookie(...puppeteerCookies, ...hcaptchaAccessiblityCookies);
      await page.setRequestInterception(true);
      page.on('request', this.requestInterceptor.bind(this));
      return page;
    } catch (err) {
      await this.handlePageError(err, page);
      throw err;
    }
  }

  private requestInterceptor(interceptedRequest: HTTPRequest): void {
    if (interceptedRequest.isInterceptResolutionHandled()) return;
    const reqUrl = interceptedRequest.url();
    if (!NON_SPEND_HCAPTCHA_URLS.includes(reqUrl) && SPEND_REGEX.test(reqUrl)) {
      // TODO: consider using PP token to get hcaptcha accessibility cookie
      this.L.debug('Intercepting hcaptcha getcaptcha request');
      const hcToken = getHcaptchaPrivacyPassToken();
      if (!hcToken) {
        interceptedRequest.continue();
        return;
      }
      const method = interceptedRequest.method();
      const { hostname, pathname } = new URL(reqUrl);
      const headers = interceptedRequest.headers();
      const token = getRedemptionToken(hcToken, reqUrl, method);
      headers['challenge-bypass-token'] = token;
      headers['challenge-bypass-host'] = hostname;
      headers['challenge-bypass-path'] = `${method} ${pathname}`;
      this.L.trace({ headers }, 'Modified captcha headers');
      interceptedRequest.continue({ headers });
      return;
    }
    interceptedRequest.continue();
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
