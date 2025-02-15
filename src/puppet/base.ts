import { Logger } from 'pino';
import { Page, Browser, Cookie } from 'puppeteer';
import path from 'path';
import { ensureDir } from 'fs-extra/esm';
import logger from '../common/logger.js';
import {
  getDevtoolsUrl,
  safeNewPage,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer.js';
import { getCookiesRaw, setPuppeteerCookies, userHasValidCookie } from '../common/cookie.js';
import { config } from '../common/config/index.js';
import { getAccountAuth } from '../common/device-auths.js';
import {
  ACCOUNT_EULA_HISTORY_ENDPOINT,
  STORE_CART_EN,
  STORE_HOMEPAGE,
} from '../common/constants.js';
import { generateLoginRedirect } from '../purchase.js';
import { sendNotification } from '../notify.js';
import { NotificationReason } from '../interfaces/notification-reason.js';
import { EulaResponse } from '../interfaces/accounts.js';

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

  protected async requestRaw(method: string, url: string, headers?: Record<string, string>) {
    if (!this.page) {
      this.page = await this.setupPage();
      await this.page.goto(STORE_CART_EN, { waitUntil: 'networkidle0' });
    }

    const fetchUrl = new URL(url);

    const resp = await this.page.evaluate(
      async (inFetchUrl: string, inMethod: string, inHeaders) => {
        const response = await fetch(inFetchUrl, {
          method: inMethod,
          headers: inHeaders,
        });
        const body = await response.text();
        return { headers: Object.fromEntries(response.headers), body, status: response.status };
      },
      fetchUrl.toString(),
      method,
      headers,
    );
    return resp;
  }

  private async checkEula(): Promise<void> {
    const REQUIRED_EULAS = ['epicgames_privacy_policy_no_table', 'egstore'];
    this.L.trace(
      { url: ACCOUNT_EULA_HISTORY_ENDPOINT, requiredEulas: REQUIRED_EULAS },
      'Checking acount EULA history',
    );
    const resp = await this.request<EulaResponse>('GET', ACCOUNT_EULA_HISTORY_ENDPOINT);
    this.L.debug({ resp }, 'Eula history response');
    const acceptedEulaKeys = resp.data
      .filter((eulaEntry) => eulaEntry.accepted)
      .map((eulaEntry) => eulaEntry.key);
    const hasRequiredEulas = REQUIRED_EULAS.every((requiredKey) =>
      acceptedEulaKeys.includes(requiredKey),
    );

    if (!hasRequiredEulas) {
      this.L.error('User needs to log in an accept an updated EULA');
      const actionUrl = generateLoginRedirect(STORE_HOMEPAGE);
      sendNotification(this.email, NotificationReason.PRIVACY_POLICY_ACCEPTANCE, actionUrl);
      throw new Error(`${this.email} needs to accept an updated EULA`);
    }
  }

  protected async setupPage(): Promise<Page> {
    // Get cookies or latest access_token cookies
    let puppeteerCookies: Cookie[] = [];
    if (userHasValidCookie(this.email, 'EPIC_BEARER_TOKEN')) {
      this.L.debug('Setting auth from cookies');
      const userCookies = await getCookiesRaw(this.email);
      puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    } else {
      const deviceAuth = getAccountAuth(this.email);
      if (!deviceAuth) throw new Error(`Unable to get auth for user ${this.email}`);
      this.L.debug({ deviceAuth }, 'Setting auth from device auth');
      const bearerCookies: Cookie[] = [
        '.epicgames.com',
        '.twinmotion.com',
        '.fortnite.com',
        '.unrealengine.com',
      ].map((domain) => {
        const name = 'EPIC_BEARER_TOKEN';
        const value = deviceAuth.access_token;
        const size = name.length + value.length;
        return {
          name,
          value,
          expires: new Date(deviceAuth.expires_at).getTime() / 1000,
          domain,
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: 'Lax',
          session: false,
          size,
        };
      });
      puppeteerCookies.push(...bearerCookies);
    }
    this.L.debug('Logging in with puppeteer');
    this.page = await safeNewPage(this.browser, this.L);
    try {
      this.L.trace(getDevtoolsUrl(this.page));
      await this.page.goto(STORE_CART_EN, { waitUntil: 'networkidle0' });
      await this.browser.setCookie(...puppeteerCookies); // must happen **after** navigating
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
      const currentCookies = await this.browser.cookies();
      setPuppeteerCookies(this.email, currentCookies);
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
