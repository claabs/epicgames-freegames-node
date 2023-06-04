/* eslint-disable class-methods-use-this */
import { Protocol } from 'puppeteer';
import { STORE_CART_EN } from '../common/constants';
import PuppetBase from './base';
import { userHasRememberCookie } from '../common/cookie';

export default class PuppetLogin extends PuppetBase {
  async refreshCookieLogin(): Promise<boolean> {
    if (!userHasRememberCookie(this.email)) return false;
    const page = await this.setupPage();
    try {
      await page.goto(STORE_CART_EN, {
        waitUntil: 'networkidle0',
      });
      const cdpClient = await page.target().createCDPSession();
      const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
        cookies: Protocol.Network.Cookie[];
      };
      if (currentUrlCookies.cookies.find((c) => c.name === 'storeTokenExpires')) {
        return true;
      }
    } catch (err) {
      await this.handlePageError(err, page);
    }
    await this.teardownPage(page);
    return false;
  }
}
