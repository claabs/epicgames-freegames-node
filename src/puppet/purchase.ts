/* eslint-disable class-methods-use-this */
import { outputFileSync } from 'fs-extra';
import path from 'path';
import { Logger } from 'pino';
import { Browser, CDPSession, Protocol, ElementHandle, Page } from 'puppeteer';
import { config, CONFIG_DIR } from '../common/config';
import { EPIC_PURCHASE_ENDPOINT, STORE_HOMEPAGE_EN } from '../common/constants';
import { getLocaltunnelUrl } from '../common/localtunnel';
import logger from '../common/logger';
import puppeteer, {
  getDevtoolsUrl,
  launchArgs,
  toughCookieFileStoreToPuppeteerCookie,
} from '../common/puppeteer';
import { getCookiesRaw, setPuppeteerCookies } from '../common/request';
import { NotificationReason } from '../interfaces/notification-reason';
import { sendNotification } from '../notify';
import { getHcaptchaCookies } from './hcaptcha';

const NOTIFICATION_TIMEOUT = config.notificationTimeoutHours * 60 * 60 * 1000;

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
    const browser = await puppeteer.launch(launchArgs);
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
    });
    await page.goto(`${STORE_HOMEPAGE_EN}p/${productSlug}`);
    this.L.trace('Waiting for getButton');
    const getButton = (await page.waitForSelector(
      `button[data-testid='purchase-cta-button']:not([aria-disabled='true'])`
    )) as ElementHandle<HTMLButtonElement>;
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
        await new Promise((resolve) => setTimeout(resolve, poll));
        return waitForPurchaseButton(startTime);
      }
    };

    const [placeOrderButton] = await Promise.all([
      waitForPurchaseButton(),
      page.waitForNetworkIdle(),
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
      cookies: Protocol.Network.Cookie[];
    };
    setPuppeteerCookies(this.email, currentUrlCookies.cookies);
    this.L.trace('Saved cookies, closing browser');
    await browser.close();
  }

  private async waitForHCaptcha(page: Page): Promise<'captcha' | 'nav'> {
    try {
      const talonHandle = await page.$('iframe#talon_frame_checkout_free_prod');
      if (!talonHandle) throw new Error('Could not find talon_frame_checkout_free_prod');
      const talonFrame = await talonHandle.contentFrame();
      if (!talonFrame) throw new Error('Could not find talonFrame contentFrame');
      this.L.trace('Waiting for hcaptcha iframe');
      await talonFrame.waitForSelector(`#challenge_container_hcaptcha > iframe[src*="hcaptcha"]`, {
        visible: true,
      });
      return 'captcha';
    } catch (err) {
      if (err.message.includes('timeout')) {
        throw err;
      }
      if (err.message.includes('detached')) {
        this.L.trace(err);
      } else {
        this.L.warn(err);
      }
      return 'nav';
    }
  }

  /**
   * Completes a purchase starting from the purchase iframe using its namespace and offerId
   */
  public async purchaseShort(namespace: string, offer: string): Promise<void> {
    const hCaptchaCookies = await getHcaptchaCookies();
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    this.L.debug('Purchasing with puppeteer (short)');
    const browser = await puppeteer.launch(launchArgs);
    const page = await browser.newPage();
    this.L.trace(getDevtoolsUrl(page));
    const cdpClient = await page.target().createCDPSession();
    try {
      await cdpClient.send('Network.setCookies', {
        cookies: [...puppeteerCookies, ...hCaptchaCookies],
      });
      await page.setCookie(...puppeteerCookies, ...hCaptchaCookies);
      const purchaseUrl = `${EPIC_PURCHASE_ENDPOINT}?highlightColor=0078f2&offers=1-${namespace}-${offer}&orderId&purchaseToken&showNavigation=true`;
      this.L.info({ purchaseUrl }, 'Loading purchase page');
      await page.goto(purchaseUrl, { waitUntil: 'networkidle0' });
      await page.waitForNetworkIdle({ idleTime: 2000 });
      try {
        this.L.trace('Waiting for cookieDialog');
        const cookieDialog = (await page.waitForSelector(`button#onetrust-accept-btn-handler`, {
          timeout: 3000,
        })) as ElementHandle<HTMLButtonElement>;
        this.L.trace('Clicking cookieDialog');
        await cookieDialog.click({ delay: 100 });
      } catch (err) {
        if (!err.message.includes('timeout')) {
          throw err;
        }
        this.L.trace('No cookie dialog presented');
      }
      this.L.trace('Waiting for placeOrderButton');
      const placeOrderButton = (await page.waitForSelector(
        `button.payment-btn:not([disabled])`
      )) as ElementHandle<HTMLButtonElement>;
      this.L.debug('Clicking placeOrderButton');
      await placeOrderButton.click({ delay: 100 });
      try {
        const euRefundAgreeButton = (await page.waitForSelector(
          `div.payment-confirm__actions > button.payment-btn.payment-confirm__btn.payment-btn--primary`,
          { timeout: 3000 }
        )) as ElementHandle<HTMLButtonElement>;
        this.L.debug('Clicking euRefundAgreeButton');
        await euRefundAgreeButton.click({ delay: 100 });
      } catch (err) {
        if (!err.message.includes('timeout')) {
          throw err;
        }
        this.L.trace('No EU "Refund and Right of Withdrawal Information" dialog presented');
      }
      this.L.debug('Waiting for receipt');
      const purchaseEvent = await Promise.race([
        page
          .waitForFunction(() => document.location.hash.includes('/purchase/receipt'))
          .then(() => 'nav'),
        page
          .waitForSelector('span.payment-alert__content')
          .then((errorHandle: ElementHandle<HTMLSpanElement> | null) =>
            errorHandle ? errorHandle.evaluate((el) => el.innerText) : 'Unknown purchase error'
          ),
        this.waitForHCaptcha(page),
      ]);
      if (purchaseEvent === 'captcha') {
        this.L.debug('Captcha detected');
        let url = await page.openPortal();
        if (config.webPortalConfig?.localtunnel) {
          url = await getLocaltunnelUrl(url);
        }
        this.L.info({ url }, 'Go to this URL and do something');
        await sendNotification(url, this.email, NotificationReason.PURCHASE);
        await page
          .waitForFunction(() => document.location.hash.includes('/purchase/receipt'), {
            timeout: NOTIFICATION_TIMEOUT,
          })
          .then(() => 'nav');
        await page.closePortal();
      } else if (purchaseEvent !== 'nav') {
        throw new Error(purchaseEvent);
      }
      await this.finishPurchase(browser, cdpClient);
    } catch (err) {
      let success = false;
      if (page) {
        const errorPrefix = `error-${new Date().toISOString()}`.replace(/:/g, '-');
        const errorImage = path.join(CONFIG_DIR, `${errorPrefix}.png`);
        await page.screenshot({ path: errorImage });
        const errorHtml = path.join(CONFIG_DIR, `${errorPrefix}.html`);
        const htmlContent = await page.content();
        outputFileSync(errorHtml, htmlContent, 'utf8');
        this.L.error(
          { errorImage, errorHtml },
          'Encountered an error during browser automation. Saved a screenshot and page HTML for debugging purposes.'
        );
        if (!config.noHumanErrorHelp)
          success = await this.sendErrorManualHelpNotification(page, browser, cdpClient);
      }
      if (browser) await browser.close();
      if (!success) throw err;
    }
  }

  private async finishPurchase(browser: Browser, cdpClient: CDPSession): Promise<void> {
    this.L.trace(`Puppeteer purchase successful`);
    this.L.trace('Saving new cookies');
    const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
      cookies: Protocol.Network.Cookie[];
    };
    setPuppeteerCookies(this.email, currentUrlCookies.cookies);
    this.L.trace('Saved cookies, closing browser');
    await browser.close();
  }

  private async sendErrorManualHelpNotification(
    page: Page,
    browser: Browser,
    cdpClient: CDPSession
  ): Promise<boolean> {
    this.L.info('Asking a human for help...');
    try {
      let url = await page.openPortal();
      if (config.webPortalConfig?.localtunnel) {
        url = await getLocaltunnelUrl(url);
      }
      this.L.info({ url }, 'Go to this URL and purchase the game');
      await sendNotification(url, this.email, NotificationReason.PURCHASE_ERROR);
      await page.waitForFunction(() => document.location.hash.includes('/purchase/receipt'), {
        timeout: NOTIFICATION_TIMEOUT,
      });
      await page.closePortal();
      await this.finishPurchase(browser, cdpClient);
      return true;
    } catch (err) {
      this.L.error('Encountered an error when asking a human for help');
      this.L.error(err);
      return false;
    }
  }
}
