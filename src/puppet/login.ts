import { Logger } from 'pino';
import logger from '../common/logger';
import puppeteer, {
  puppeteerCookieToToughCookieFileStore,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, mergeCookiesRaw } from '../common/request';

export default class PuppetLogin {
  private L: Logger;

  private username: string;

  constructor(username: string) {
    this.L = logger.child({
      user: username,
    });
    this.username = username;
  }

  async login(email: string, password: string, captcha = '', totp = ''): Promise<void> {
    const userCookies = await getCookiesRaw(this.username);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setCookie(...puppeteerCookies);
    await page.goto('https://www.epicgames.com/id/login/epic');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const emailElem = await page.waitForSelector('#email');
    await emailElem.type(email);
    const passElem = await page.waitForSelector('#password');
    await passElem.type(password);
    // Remember me should be checked by default
    const signInElem = await page.waitForSelector('#sign-in:not([disabled]');
    await signInElem.click();
    // TODO: captcha
    // TODO: totp

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const currentUrlCookies = await page.cookies();
    const cookieData = puppeteerCookieToToughCookieFileStore(currentUrlCookies);
    await mergeCookiesRaw(this.username, cookieData);
  }
}
