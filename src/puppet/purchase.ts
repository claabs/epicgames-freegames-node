/* eslint-disable class-methods-use-this */
import { Logger } from 'pino';
import { Cookie, ElementHandle, Page } from 'puppeteer';
import logger from '../common/logger';
import puppeteer, {
  getDevtoolsUrl,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, setPuppeteerCookies } from '../common/request';
import { getHcaptchaCookies } from './hcaptcha';

const NOTIFICATION_TIMEOUT = 24 * 60 * 60 * 1000; // TODO: Add to config

export default class PuppetPurchase {
  private L: Logger;

  private email: string;

  constructor(email: string) {
    this.L = logger.child({
      user: email,
    });
    this.email = email;
  }

  async purchase(productSlug: string): Promise<void> {
    const hCaptchaCookies = await getHcaptchaCookies();
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    this.L.debug('Purchasing with puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
    });
    const page = await browser.newPage();
    this.L.trace(getDevtoolsUrl(page));
    const cdpClient = await page.target().createCDPSession();
    await cdpClient.send('Network.setCookies', {
      cookies: [...puppeteerCookies, ...hCaptchaCookies],
    });
    await page.setCookie(...puppeteerCookies, ...hCaptchaCookies);
    await page.setCookie({
      name: 'HAS_ACCEPTED_AGE_GATE_ONCE',
      domain: 'www.epicgames.com',
      value: 'true',
      session: true,
    });
    await page.goto(`https://www.epicgames.com/store/en-US/p/${productSlug}`);
    this.L.trace('Waiting for getButton');
    const getButton = await page.waitForSelector(
      `button[data-testid='purchase-cta-button']:not([aria-disabled='true'])`
    );
    // const buttonMessage: ElementHandle<HTMLSpanElement> | null = await getButton.$(
    //   `span[data-component='Message']`
    // );
    await getButton.click({ delay: 100 });
    this.L.trace('Waiting for placeOrderButton');

    const waitForPurchaseButton = async (
      startTime = new Date()
    ): Promise<ElementHandle<HTMLButtonElement>> => {
      const timeout = 30000;
      const poll = 100;
      try {
        const purchaseHandle = await page.waitForSelector('#webPurchaseContainer > iframe', {
          timeout: 100,
        });
        if (!purchaseHandle) throw new Error('Could not find webPurchaseContainer iframe');
        const purchaseFrame = await purchaseHandle.contentFrame();
        if (!purchaseFrame) throw new Error('Could not find purchaseFrame contentFrame');
        const button = await purchaseFrame.$(`button.payment-btn`);
        if (!button) throw new Error('Could not find purchase button in iframe');
        return button;
      } catch (err) {
        if (startTime.getTime() + timeout <= new Date().getTime()) {
          throw new Error(`Timeout after ${timeout}ms: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, poll));
        return waitForPurchaseButton(startTime);
      }
    };

    const [paymentButton] = await Promise.all([
      waitForPurchaseButton(),
      page.waitForResponse('https://talon-service-prod.ak.epicgames.com/v1/phaser/batch'), // Would use waitForNetworkIdle if on modern puppeteer
    ]);
    this.L.trace('Clicking placeOrderButton');
    await paymentButton.click({ delay: 100 });
    this.L.trace('Waiting for purchased button');
    await page.waitForSelector(
      `button[data-testid='purchase-cta-button'] > span[data-component='Icon']`
    );
    this.L.info(`Puppeteer purchase of ${productSlug} complete`);
    this.L.trace('Saving new cookies');
    const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
      cookies: Cookie[];
    };
    await browser.close();
    setPuppeteerCookies(this.email, currentUrlCookies.cookies);
  }

  private async waitForHCaptcha(page: Page): Promise<ElementHandle<Element>> {
    const talonHandle = await page.$('iframe#talon_frame_login_prod');
    if (!talonHandle) throw new Error('Could not find talon_frame_login_prod');
    const talonFrame = await talonHandle.contentFrame();
    if (!talonFrame) throw new Error('Could not find talonFrame contentFrame');
    this.L.trace('Waiting for hcaptcha iframe');
    const hcaptchaFrame = await talonFrame.waitForSelector(`iframe[src*='hcaptcha']`);
    return hcaptchaFrame;
  }

  private async handleCaptchaSolved(page: Page): Promise<void> {
    this.L.trace('Waiting for MFA possibility');
    const result = await Promise.race([
      page.waitForSelector(`input[name="code-input-0]`, {
        timeout: NOTIFICATION_TIMEOUT,
      }),
      page.waitForSelector('div[role="alert"] > h6:first-of-type', {
        timeout: NOTIFICATION_TIMEOUT,
        visible: true,
      }),
      page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: NOTIFICATION_TIMEOUT,
      }),
    ]);
  }
}
