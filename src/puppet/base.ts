import path from 'node:path';

import { ensureDir } from 'fs-extra/esm';

import { config } from '../common/config/index.js';
import { STORE_CART_EN } from '../common/constants.js';
import { getCookiesRaw, setPuppeteerCookies, userHasValidCookie } from '../common/cookie.js';
import { getAccountAuth } from '../common/device-auths.js';
import logger from '../common/logger.js';
import {
  getDevtoolsUrl,
  safeNewPage,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer.js';

import type { Logger } from 'pino';
import type { Browser, Cookie, Page } from 'puppeteer';

export interface PuppetBaseProps {
  browser: Browser;
  email: string;
}

interface RawRequestResponse {
  headers: Record<string, string>;
  body: string;
  status: number;
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

  protected async requestRaw(
    method: string,
    url: string,
    headers?: Record<string, string>,
  ): Promise<RawRequestResponse> {
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

  protected async setupPage(): Promise<Page> {
    // Get cookies or latest access_token cookies
    let puppeteerCookies: Cookie[] = [];
    if (await userHasValidCookie(this.email, 'EPIC_BEARER_TOKEN')) {
      this.L.debug('Setting auth from bearer token cookies');
      const userCookies = await getCookiesRaw(this.email);
      puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    }
    const deviceAuth = await getAccountAuth(this.email);
    if (deviceAuth) {
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
    } else {
      this.L.warn('No device auth found, auth issues may occur');
    }
    this.L.debug('Logging in with puppeteer');
    this.page = await safeNewPage(this.browser, this.L);
    try {
      this.L.trace(getDevtoolsUrl(this.page));
      await this.browser.setCookie(...puppeteerCookies);
      await this.page.goto(STORE_CART_EN, { waitUntil: 'networkidle0' }); // Get EG1 cookie
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
      await setPuppeteerCookies(this.email, currentCookies);
      this.L.trace('Saved cookies, closing browser');
      // await this.page.close(); // Getting `Protocol error (Target.createTarget): Target closed` with this for some reason
      this.page = undefined;
    } catch (err) {
      await this.handlePageError(err);
    }
  }

  protected async handlePageError(err: unknown): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      const errorFile = `error-${new Date().toISOString()}.png`;
      await ensureDir(config.errorsDir);
      await this.page.screenshot({
        path: path.join(config.errorsDir, errorFile) as `${string}.png`,
      });
      this.L.error(
        { errorFile },
        'Encountered an error during browser automation. Saved a screenshot for debugging purposes.',
      );
      await this.page.close();
    }
    this.page = undefined;
    throw err;
  }
}
