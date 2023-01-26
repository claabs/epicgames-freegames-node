/* eslint-disable class-methods-use-this */
import { outputFileSync } from 'fs-extra';
import path from 'path';
import { ElementHandle, Page } from 'puppeteer';
import { config, CONFIG_DIR } from '../common/config';
import { EPIC_PURCHASE_ENDPOINT } from '../common/constants';
import { NotificationReason } from '../interfaces/notification-reason';
import PuppetBase from './base';

const NOTIFICATION_TIMEOUT = config.notificationTimeoutHours * 60 * 60 * 1000;

export default class PuppetPurchase extends PuppetBase {
  private async waitForHCaptcha(page: Page): Promise<'captcha' | 'nav'> {
    try {
      await page.waitForSelector(`.h_captcha_challenge > iframe[src*="hcaptcha"]`, {
        visible: true,
      });
      return 'captcha';
    } catch (err) {
      if (err.message.includes('timeout')) {
        throw err;
      }
      if (err.message.includes('detached') || err.message.includes('Target closed')) {
        this.L.trace(err);
      } else {
        this.L.warn(err);
      }
      return 'nav';
    }
  }

  private async waitForPurchaseEvent(page: Page): Promise<'captcha' | 'nav' | 'refund' | string> {
    this.L.debug('Waiting for receipt, captcha, refund dialog, or error');
    return Promise.race([
      page
        .waitForFunction(() => document.location.hash.includes('/purchase/receipt'))
        .then(() => 'nav'),
      page
        .waitForSelector('.payment-alert--ERROR > span.payment-alert__content')
        .then((errorHandle: ElementHandle<HTMLSpanElement> | null) =>
          errorHandle ? errorHandle.evaluate((el) => el.innerText) : 'Unknown purchase error'
        ),
      this.waitForHCaptcha(page),
      page
        .waitForSelector(
          `div.payment-confirm__actions > button.payment-btn.payment-confirm__btn.payment-btn--primary`
        )
        .then(() => 'refund'),
    ]);
  }

  private async handleCookieDialog(page: Page): Promise<void> {
    this.L.debug('Waiting for cookie dialog');
    const cookieButton = await page
      .waitForSelector(`button#onetrust-accept-btn-handler`, { timeout: 3000 })
      .catch(() => null);
    if (!cookieButton) return;

    this.L.debug('Clicking cookieDialog');
    await cookieButton.click({ delay: 100 });
    this.L.debug('Waiting for cookieDialog to be hidden');
    await page.waitForSelector(`#onetrust-banner-sdk`, { hidden: true });
  }

  /**
   * Completes a purchase starting from the purchase iframe using its namespace and offerId
   */
  public async purchaseShort(namespace: string, offer: string): Promise<void> {
    const page = await this.setupPage();
    try {
      const purchaseUrl = `${EPIC_PURCHASE_ENDPOINT}?highlightColor=0078f2&offers=1-${namespace}-${offer}&orderId&purchaseToken&showNavigation=true`;

      /**
       * This inner function is declared to allow the page to be refreshed after a 3 hour timeout
       */
      // eslint-disable-next-line consistent-return
      const initPurchase = async (): Promise<void> => {
        this.L.info({ purchaseUrl }, 'Loading purchase page');
        await page.goto(purchaseUrl, { waitUntil: 'networkidle0' });
        await page.waitForNetworkIdle({ idleTime: 2000 });
        await this.handleCookieDialog(page);
        this.L.debug('Waiting for order button');
        const placeOrderButton = await page.waitForSelector(`button.payment-btn:not([disabled])`);
        if (!placeOrderButton) {
          throw new Error('Could not detect placeOrderButton');
        }
        this.L.debug('Clicking placeOrderButton');
        await placeOrderButton.click({ delay: 100 });
        let purchaseEvent = await this.waitForPurchaseEvent(page);
        if (purchaseEvent === 'refund') {
          this.L.debug('Clicking euRefundAgreeButton');
          const euRefundAgreeButton = (await page.waitForSelector(
            `div.payment-confirm__actions > button.payment-btn.payment-confirm__btn.payment-btn--primary`
          )) as ElementHandle<HTMLButtonElement>;
          await euRefundAgreeButton.click({ delay: 100 });
          purchaseEvent = await this.waitForPurchaseEvent(page);
        }
        if (purchaseEvent === 'captcha') {
          this.L.debug('Captcha detected');
          // Keep the existing portal open
          if (!page.hasOpenPortal()) {
            await this.openPortalAndNotify(page, NotificationReason.PURCHASE);
          }
          const interactionResult = await Promise.race([
            page
              .waitForFunction(() => document.location.hash.includes('/purchase/receipt'), {
                timeout: NOTIFICATION_TIMEOUT,
              })
              .then(() => 'nav'),
            page.waitForTimeout(3 * 60 * 60 * 1000).then(() => 'timeout'),
          ]);
          if (interactionResult === 'timeout') {
            this.L.info('Reloading purchase page...'); // Reload page after 3 hour timeout
            return initPurchase();
          }
          await page.closePortal();
        } else if (purchaseEvent !== 'nav') {
          throw new Error(purchaseEvent);
        }
      };

      await initPurchase();
      this.L.trace(`Puppeteer purchase successful`);
      await this.teardownPage(page);
    } catch (err) {
      let success = false;
      if (page) {
        const errorPrefix = `error-${new Date().toISOString()}`.replace(/:/g, '-');
        const errorImage = path.join(CONFIG_DIR, `${errorPrefix}.png`);
        await page.screenshot({ path: errorImage });
        const errorHtml = path.join(CONFIG_DIR, `${errorPrefix}.html`);
        const htmlContent = await page.content();
        outputFileSync(errorHtml, htmlContent, 'utf8');
        this.L.warn(err);
        this.L.error(
          { errorImage, errorHtml },
          'Encountered an error during browser automation. Saved a screenshot and page HTML for debugging purposes.'
        );
        if (!config.noHumanErrorHelp) success = await this.sendErrorManualHelpNotification(page);
        await page.close();
      }
      if (!success) throw err;
    }
  }

  private async sendErrorManualHelpNotification(page: Page): Promise<boolean> {
    this.L.info('Asking a human for help...');
    try {
      await this.openPortalAndNotify(page, NotificationReason.PURCHASE_ERROR);
      const interactionResult = await Promise.race([
        page
          .waitForFunction(() => document.location.hash.includes('/purchase/receipt'), {
            timeout: NOTIFICATION_TIMEOUT,
          })
          .then(() => 'nav'),
        page
          .waitForResponse((res) => res.url().endsWith('/purchase/confirm-order') && !res.ok(), {
            timeout: NOTIFICATION_TIMEOUT,
          })
          .then(() => 'error'),
      ]);
      if (interactionResult === 'error') {
        throw new Error('Encountered an error when asking a human for help');
      }
      await page.closePortal();
      await this.teardownPage(page);
      return true;
    } catch (err) {
      this.L.error(err);
      return false;
    }
  }
}
