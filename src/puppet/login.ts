import PuppetBase from './base.js';
import { STORE_CART_EN } from '../common/constants.js';
import { getCookiesRaw, userHasValidCookie } from '../common/cookie.js';
import {
  getDevtoolsUrl,
  safeNewPage,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer.js';
import { generateLoginRedirect } from '../purchase.js';

import type { Page } from 'puppeteer';

export default class PuppetLogin extends PuppetBase {
  /**
   * @returns true if auth is ready to be used
   */
  async refreshCookieLogin(): Promise<boolean> {
    if (!(await userHasValidCookie(this.email, 'EPIC_SSO_RM'))) return false;
    try {
      this.page ??= await this.setupPage();
      const url = generateLoginRedirect(STORE_CART_EN);
      this.L.trace({ url }, 'Visiting login cart redirect');
      await this.page.goto(url, {
        waitUntil: 'networkidle0',
      });
      const currentCookies = await this.browser.cookies();
      if (currentCookies.find((c) => c.name === 'EPIC_BEARER_TOKEN')) {
        this.L.debug('Successfully refreshed cookie auth');
        await this.teardownPage();
        return true;
      }
    } catch (err) {
      await this.handlePageError(err);
    }
    await this.teardownPage();
    return false;
  }

  protected override async setupPage(): Promise<Page> {
    this.L.debug('Setting auth from cookies');
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);

    this.L.debug('Logging in with puppeteer');
    this.page = await safeNewPage(this.browser, this.L);
    try {
      this.L.trace(getDevtoolsUrl(this.page));
      await this.browser.setCookie(...puppeteerCookies);
      return this.page;
    } catch (err) {
      await this.handlePageError(err);
      throw err;
    }
  }
}
