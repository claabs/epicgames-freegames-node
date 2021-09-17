/* eslint-disable class-methods-use-this */
import { Logger } from 'pino';
import { Cookie, ElementHandle } from 'puppeteer';
import logger from '../common/logger';
import puppeteer, {
  getDevtoolsUrl,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, setPuppeteerCookies } from '../common/request';
import { getHcaptchaCookies } from './hcaptcha';

export default class PuppetPurchase {
  private L: Logger;

  private email: string;

  constructor(email: string) {
    this.L = logger.child({
      user: email,
    });
    this.email = email;
  }

  /**
   * Completes a purchase starting from the product page using its productSlug
   * **Currently unused**
   */
  public async purchaseFull(productSlug: string): Promise<void> {
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

    const [placeOrderButton] = await Promise.all([
      waitForPurchaseButton(),
      page.waitForResponse('https://talon-service-prod.ak.epicgames.com/v1/phaser/batch'), // Would use waitForNetworkIdle if on modern puppeteer
    ]);
    this.L.trace('Clicking placeOrderButton');
    await placeOrderButton.click({ delay: 100 });
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

  /**
   * Completes a purchase starting from the purchase iframe using its namespace and offerId
   */
  public async purchaseShort(namespace: string, offer: string): Promise<void> {
    const hCaptchaCookies = await getHcaptchaCookies();
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    this.L.debug('Purchasing with puppeteer (short)');
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
    this.L.trace('Loading purchase page');
    // https://www.epicgames.com/store/purchase?namespace=d3f34b351df646e0ab932fd8d8e5dfc2&showNavigation=true&highlightColor=0078f2&offers=d89d1ecf209d42688d82909e522f2ec1
    await page.goto(
      `https://www.epicgames.com/store/purchase?namespace=${namespace}&showNavigation=true&highlightColor=0078f2&offers=${offer}`,
      { waitUntil: 'networkidle0' }
    );
    this.L.trace('Waiting for placeOrderButton');
    const placeOrderButton = await page.waitForSelector(`button.payment-btn`);
    this.L.trace('Clicking placeOrderButton');
    await placeOrderButton.click({ delay: 100 });
    // TODO: Check for captcha and notify with portal. Currently, no games require a captcha on purchase, so it's not possible to implement.
    try {
      const euRefundAgreeButton = await page.waitForSelector(
        `div.payment-confirm__actions > button.payment-btn.payment-confirm__btn.payment-btn--primary`,
        { timeout: 3000 }
      );
      this.L.trace('Clicking euRefundAgreeButton');
      await euRefundAgreeButton.click({ delay: 100 });
    } catch (err) {
      if (!err.message.includes('timeout')) {
        throw err;
      }
      this.L.trace('No EU "Refund and Right of Withdrawal Information" dialog presented');
    }
    this.L.trace('Waiting for receipt');
    const purchaseError = await Promise.race([
      page
        // eslint-disable-next-line no-undef
        .waitForFunction(() => document.location.hash.includes('/purchase/receipt'))
        .then(() => null),
      page
        .waitForSelector('span.payment-alert__content')
        .then((errorHandle: ElementHandle<HTMLSpanElement>) =>
          errorHandle.evaluate(el => el.innerText)
        ),
    ]);
    if (purchaseError) throw new Error(purchaseError);
    this.L.trace(`Puppeteer purchase successful`);
    this.L.trace('Saving new cookies');
    const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
      cookies: Cookie[];
    };
    await browser.close();
    setPuppeteerCookies(this.email, currentUrlCookies.cookies);
  }
}
