import { Logger } from 'pino';
import { Protocol, Page, Browser, CookieParam } from 'puppeteer';
import path from 'path';
import { ensureDir } from 'fs-extra/esm';
import logger from '../common/logger.js';
import {
  getDevtoolsUrl,
  safeLaunchBrowser,
  safeNewPage,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer.js';
import { getCookiesRaw, setPuppeteerCookies, userHasValidCookie } from '../common/cookie.js';
import { config } from '../common/config/index.js';
import { getAccountAuth } from '../common/device-auths.js';
import { STORE_CART_EN, STORE_HOMEPAGE } from '../common/constants.js';
import { generateIdRedirect, generateLoginRedirect } from '../purchase.js';
import { IdRedirectReponseGood, IdRedirectResponseBad } from '../interfaces/id.js';
import { sendNotification } from '../notify.js';
import { NotificationReason } from '../interfaces/notification-reason.js';

export interface PuppetBaseProps {
  browser: Browser;
  email: string;
}

export default class PuppetBase {
  protected L: Logger;

  protected email: string;

  protected browser: Browser;

  protected page?: Page;

  constructor(props: PuppetBaseProps) {
    this.browser = props.browser;
    this.email = props.email;
    this.L = logger.child({
      user: this.email,
    });
  }

  protected async request<T = unknown>(
    method: string,
    url: string,
    params?: Record<string, string>,
    throwForError = false,
  ): Promise<T> {
    if (!this.page) {
      this.page = await this.setupPage();
      await this.page.goto(STORE_CART_EN, { waitUntil: 'networkidle0' });
    }

    let fetchUrl: URL;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fetchUrl = new URL(`${url}?${searchParams}`);
    } else {
      fetchUrl = new URL(url);
    }
    const resp = await this.page.evaluate(
      async (inFetchUrl: string, inMethod: string) => {
        const response = await fetch(inFetchUrl, {
          method: inMethod,
        });
        const json = (await response.json()) as T;
        if (!response.ok && throwForError) throw new Error(JSON.stringify(json));
        return json;
      },
      fetchUrl.toString(),
      method,
    );
    return resp;
  }

  private async checkEula(): Promise<void> {
    const idRedirectUrl = generateIdRedirect(STORE_CART_EN);
    this.L.trace({ url: idRedirectUrl }, 'Checking for account corrective actions');
    const resp = await this.request<IdRedirectReponseGood | IdRedirectResponseBad>(
      'GET',
      idRedirectUrl,
      undefined,
      true,
    );
    this.L.debug({ resp }, 'Account corrective action response');
    if ('errorCode' in resp && resp.metadata.correctiveAction === 'PRIVACY_POLICY_ACCEPTANCE') {
      const actionUrl = generateLoginRedirect(STORE_HOMEPAGE);
      sendNotification(this.email, NotificationReason.PRIVACY_POLICY_ACCEPTANCE, actionUrl);
      throw new Error(resp.message);
    }
  }

  protected async setupPage(): Promise<Page> {
    // Get cookies or latest access_token cookies
    let puppeteerCookies: CookieParam[] = [];
    if (userHasValidCookie(this.email, 'EPIC_BEARER_TOKEN')) {
      this.L.debug('Setting auth from cookies');
      const userCookies = await getCookiesRaw(this.email);
      puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    } else {
      const deviceAuth = getAccountAuth(this.email);
      if (!deviceAuth) throw new Error(`Unable to get auth for user ${this.email}`);
      this.L.debug({ deviceAuth }, 'Setting auth from device auth');
      const bearerCookies: CookieParam[] = [
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
    this.page = await safeNewPage(browser, this.L);
    try {
      this.L.trace(getDevtoolsUrl(this.page));
      await this.page.setCookie(...puppeteerCookies);
      await this.page.goto(STORE_HOMEPAGE, { waitUntil: 'networkidle2' });
      await this.checkEula();
      return this.page;
    } catch (err) {
      await this.handlePageError(err);
      throw err;
    }
  }

  protected async teardownPage(): Promise<void> {
    if (!this.page) return;
    try {
      this.L.trace('Saving new cookies');
      const cdpClient = await this.page.createCDPSession();
      const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
        cookies: Protocol.Network.Cookie[];
      };
      setPuppeteerCookies(this.email, currentUrlCookies.cookies);
      this.L.trace('Saved cookies, closing browser');
      await this.page.close();
      this.page = undefined;
    } catch (err) {
      await this.handlePageError(err);
    }
  }

  protected async handlePageError(err: unknown) {
    if (this.page) {
      const errorFile = `error-${new Date().toISOString()}.png`;
      await ensureDir(config.errorsDir);
      await this.page.screenshot({
        path: path.join(config.errorsDir, errorFile),
      });
      this.L.error(
        { errorFile },
        'Encountered an error during browser automation. Saved a screenshot for debugging purposes.',
      );
      await this.page.close();
      this.page = undefined;
    }
    throw err;
  }
}
