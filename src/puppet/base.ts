import path from 'node:path';

import { ensureDir } from 'fs-extra/esm';
import { decodeJwt } from 'jose';

import { config } from '../common/config/index.ts';
import { STORE_CART_EN, STORE_HOMEPAGE } from '../common/constants.ts';
import logger from '../common/logger.ts';
import { safeNewPage } from '../common/playwright.ts';

import type { BrowserContext, Cookie, Page } from 'patchright';
import type { Logger } from 'pino';

import type { AuthTokenResponse } from '../common/device-auths.ts';

export interface PuppetBaseProps {
  browser: BrowserContext;
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

  protected browser: BrowserContext;

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
      this.page = await safeNewPage(this.browser, this.L);
      await this.page.goto(STORE_CART_EN);
    }

    let fetchUrl: URL;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fetchUrl = new URL(`${url}?${searchParams.toString()}`);
    } else {
      fetchUrl = new URL(url);
    }
    const resp = await this.page.evaluate<T, [string, string]>(
      async ([inFetchUrl, inMethod]) => {
        const response = await fetch(inFetchUrl, {
          method: inMethod,
        });
        const json = (await response.json()) as T;
        if (!response.ok && throwForError) throw new Error(JSON.stringify(json));
        return json;
      },
      [fetchUrl.toString(), method],
    );
    return resp;
  }

  protected async requestRaw(
    method: string,
    url: string,
    headers?: Record<string, string>,
  ): Promise<RawRequestResponse> {
    if (!this.page) {
      this.page = await safeNewPage(this.browser, this.L);
      await this.page.goto(STORE_CART_EN);
    }

    const fetchUrl = new URL(url);

    const resp = await this.page.evaluate<
      RawRequestResponse,
      [string, string, Record<string, string> | undefined]
    >(
      async ([inFetchUrl, inMethod, inHeaders]) => {
        const response = await fetch(inFetchUrl, {
          method: inMethod,
          headers: inHeaders,
        });
        const body = await response.text();
        return { headers: Object.fromEntries(response.headers), body, status: response.status };
      },
      [fetchUrl.toString(), method, headers],
    );
    return resp;
  }

  public async checkCookie(): Promise<boolean> {
    const cookies = await this.browser.cookies(STORE_HOMEPAGE);
    const eg1Cookie = cookies.find((c) => c.name === 'EPIC_EG1');
    if (!eg1Cookie) return false;
    this.L.trace({ eg1Cookie }, 'EG1 cookie found');
    const jwtValue = eg1Cookie.value.split('~', 2)[1];
    if (!jwtValue) return false;
    try {
      const { exp } = decodeJwt(jwtValue);
      if (!exp) return false;
      if (new Date(exp * 1000) <= new Date()) {
        this.L.debug('EG1 cookie is expired');
        return false;
      }
      return true;
    } catch {
      this.L.warn('invalid EG1 JWT');
    }
    return false;
  }

  public async setupCookies(deviceAuth?: AuthTokenResponse): Promise<boolean> {
    this.L.debug('Logging in with Playwright');
    try {
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
        await this.browser.addCookies(bearerCookies);
      } else {
        this.L.debug('Using browser cookies as auth instead of device auth');
      }
      this.page = await safeNewPage(this.browser, this.L);
      this.L.debug('Going to page: STORE_CART_EN');
      // Get EG1 cookie;
      await this.page.goto(STORE_CART_EN);
      const deadline = new Date(Date.now() + config.browserNavigationTimeout);
      this.L.trace({ deadline }, 'Waiting for EPIC_EG1 cookie');
      while (new Date() < deadline) {
        // eslint-disable-next-line no-await-in-loop
        if (await this.checkCookie()) return true;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(resolve, 500);
        });
      }
      this.L.warn('Timed out waiting for EPIC_EG1 cookie');
      return false;
    } catch (error) {
      await this.handlePageError(error);
      throw error;
    }
  }

  protected async teardownPage(): Promise<void> {
    if (!this.page) return;
    try {
      this.L.trace('Saving new cookies');
      this.L.trace('Closing browser');
      await this.page.close();
      this.page = undefined;
    } catch (error) {
      await this.handlePageError(error);
    }
  }

  public async handlePageError(err: unknown): Promise<void> {
    if (this.page && !this.page.isClosed()) {
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
    }
    this.page = undefined;
    throw err;
  }
}
