/* eslint-disable class-methods-use-this */
import { TOTP } from 'otpauth';
import { ElementHandle, Page, Protocol } from 'puppeteer';
import { EPIC_CLIENT_ID, STORE_CART_EN, STORE_HOMEPAGE_EN } from '../common/constants';
import { NotificationReason } from '../interfaces/notification-reason';
import { config } from '../common/config';
import PuppetBase, { PuppetBaseProps } from './base';

const NOTIFICATION_TIMEOUT = config.notificationTimeoutHours * 60 * 60 * 1000;

export interface PuppetLoginProps extends PuppetBaseProps {
  password: string;
  totp?: string;
}

export default class PuppetLogin extends PuppetBase {
  private password: string;

  private totp?: string;

  constructor(props: PuppetLoginProps) {
    super(props);
    this.password = props.password;
    this.totp = props.totp;
  }

  async fullLogin(): Promise<void> {
    const page = await this.setupPage();
    try {
      if (await this.refreshLogin(page)) {
        this.L.info('Successfully refreshed login');
      } else {
        this.L.debug('Could not refresh credentials. Logging in fresh.');
        await this.login(page);
        this.L.info('Successfully logged in fresh');
      }
    } catch (err) {
      await this.handlePageError(err, page);
    }
    await this.teardownPage(page);
  }

  async refreshLogin(page: Page): Promise<boolean> {
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
    return false;
  }

  private async login(page: Page): Promise<void> {
    this.L.trace('Navigating to Epic Games login page');
    await Promise.all([
      page.goto(
        `https://www.epicgames.com/id/login/epic?redirect_uri=${STORE_HOMEPAGE_EN}&client_id=${EPIC_CLIENT_ID}`
      ),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    this.L.trace('Waiting for email field');
    const emailElem = (await page.waitForSelector('#email')) as ElementHandle<HTMLInputElement>;
    this.L.trace('Filling email field');
    await emailElem.type(this.email);
    this.L.trace('Waiting for password field');
    const passElem = (await page.waitForSelector('#password')) as ElementHandle<HTMLInputElement>;
    this.L.trace('Filling password field');
    await passElem.type(this.password);
    this.L.trace('Waiting for sign-in button');
    const [signInElem] = await Promise.all([
      page.waitForSelector('#sign-in:not([disabled])') as Promise<ElementHandle<HTMLInputElement>>,
      // page.waitForNetworkIdle(),
    ]);
    // Remember me should be checked by default
    this.L.trace('Clicking sign-in button');
    await signInElem.hover();
    await signInElem.focus();
    await Promise.all([await signInElem.click({ delay: 100 }), await this.handleLoginClick(page)]);
  }

  private async waitForHCaptcha(page: Page): Promise<'captcha' | 'nav'> {
    try {
      this.L.trace('Waiting for hcaptcha iframe');
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

  private async waitForRedirectNav(page: Page, timeout = NOTIFICATION_TIMEOUT): Promise<'nav'> {
    return page
      .waitForResponse((res) => res.url() === STORE_HOMEPAGE_EN, { timeout })
      .then(() => 'nav');
  }

  private async handleMfa(page: Page, input: ElementHandle<HTMLInputElement>): Promise<void> {
    this.L.trace('MFA detected');
    if (!this.totp) throw new Error('TOTP required for MFA login');
    const totp = new TOTP({ secret: this.totp });
    const mfaCode = totp.generate();
    this.L.trace('Filling MFA field');
    await input.type(mfaCode);
    this.L.trace('Waiting for continue button');
    const continueButton = (await page.waitForSelector(
      `button#continue`
    )) as ElementHandle<HTMLButtonElement>;
    this.L.trace('Clicking continue button');
    await Promise.all([
      await continueButton.click({ delay: 100 }),
      await page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
  }

  private async waitForError(page: Page, timeout = NOTIFICATION_TIMEOUT): Promise<string> {
    const errorHeader = (await page.waitForSelector('div[role="alert"] > h6:first-of-type', {
      timeout,
      visible: true,
    })) as ElementHandle<HTMLHeadingElement>;
    return errorHeader.evaluate((el) => el.innerText);
  }

  private async waitForMfaInput(
    page: Page,
    timeout = NOTIFICATION_TIMEOUT
  ): Promise<ElementHandle<HTMLInputElement>> {
    return page.waitForSelector(`input[name="code-input-0"]`, {
      timeout,
    }) as Promise<ElementHandle<HTMLInputElement>>;
  }

  private async handleLoginClick(page: Page): Promise<void> {
    this.L.trace('Waiting for sign-in result');
    const result = await Promise.race([
      this.waitForHCaptcha(page),
      this.waitForRedirectNav(page),
      this.waitForError(page),
      this.waitForMfaInput(page),
    ]);
    if (result === 'captcha') {
      this.L.trace('Captcha detected');
      await this.openPortalAndNotify(page, NotificationReason.LOGIN);
      await this.handleCaptchaSolved(page);
      await page.closePortal();
    } else if (result === 'nav') {
      this.L.debug('Redirected to store page, login successful');
    } else if (typeof result === 'string') {
      this.L.warn(`Login returned error: ${result}`);
      await this.login(page);
    } else {
      await this.handleMfa(page, result as ElementHandle<HTMLInputElement>);
    }
  }

  private async handleCaptchaSolved(page: Page): Promise<void> {
    this.L.trace('Waiting for MFA possibility');
    const result = await Promise.race([
      this.waitForMfaInput(page),
      this.waitForRedirectNav(page),
      this.waitForError(page),
    ]);
    if (typeof result !== 'string') {
      // result is an ElementHandle
      await this.handleMfa(page, result as ElementHandle<HTMLInputElement>);
    } else if (result !== 'nav') {
      // result is an error message
      this.L.warn(`Login returned error: ${result}`);
      await this.login(page);
    }
    // result is 'nav', success
  }
}
