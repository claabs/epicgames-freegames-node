import { TOTP } from 'otpauth';
import { Logger } from 'pino';
import { ElementHandle, Page, Response } from 'puppeteer';
import logger from '../common/logger';
import puppeteer, {
  puppeteerCookieToToughCookieFileStore,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, mergeCookiesRaw } from '../common/request';

const NOTIFICATION_TIMEOUT = 24 * 60 * 60 * 1000; // TODO: Add to config

export default class PuppetLogin {
  private L: Logger;

  private email: string;

  private password: string;

  private totp?: string;

  constructor(email: string, password: string, totp?: string) {
    this.L = logger.child({
      user: email,
    });
    this.email = email;
    this.password = password;
    this.totp = totp;
  }

  async login(): Promise<void> {
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setCookie(...puppeteerCookies);
    await Promise.all([
      page.goto('https://www.epicgames.com/id/login/epic'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);
    const emailElem = await page.waitForSelector('#email');
    await emailElem.type(this.email);
    const passElem = await page.waitForSelector('#password');
    await passElem.type(this.password);
    const signInElem = await page.waitForSelector('#sign-in:not([disabled]');
    // Remember me should be checked by default
    await Promise.all([await signInElem.click(), await this.handleLoginClick(page)]);
    const currentUrlCookies = await page.cookies();
    await browser.close();
    const cookieData = puppeteerCookieToToughCookieFileStore(currentUrlCookies);
    await mergeCookiesRaw(this.email, cookieData);
  }

  // eslint-disable-next-line class-methods-use-this
  private async handleLoginClick(page: Page): Promise<void> {
    const result = await Promise.race([
      page.waitForSelector(`iframe[src*='hcaptcha']`),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    if (!(result instanceof Response)) {
      // captcha detected
      const portalUrl = await page.openPortal();
      // TODO: Notify with url
      await this.handleMfa(page);
      await page.closePortal();
    }
  }

  private async handleMfa(page: Page): Promise<void> {
    const result = await Promise.race([
      page.waitForSelector(`input[name="code-input-0]`, {
        timeout: NOTIFICATION_TIMEOUT,
      }),
      page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: NOTIFICATION_TIMEOUT,
      }),
    ]);
    if (!(result instanceof Response)) {
      // mfa detected
      if (!this.totp) throw new Error('TOTP required for MFA login');
      const totp = new TOTP({ secret: this.totp });
      const mfaCode = totp.generate();
      await (result as ElementHandle<Element>).type(mfaCode);
      const continueButton = await page.waitForSelector(`button#continue`);
      await continueButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
  }
}
