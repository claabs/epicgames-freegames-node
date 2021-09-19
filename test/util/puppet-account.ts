/* eslint-disable class-methods-use-this */
import RandExp from 'randexp';
import { config } from 'dotenv';
import { Logger } from 'pino';
import { Page, Cookie } from 'puppeteer';
import { writeFileSync } from 'fs-extra';
import { getCookiesRaw, setPuppeteerCookies } from '../../src/common/request';
import { EPIC_CLIENT_ID } from '../../src/common/constants';
import { getHcaptchaCookies } from '../../src/puppet/hcaptcha';
import puppeteer, {
  toughCookieFileStoreToPuppeteerCookie,
  getDevtoolsUrl,
} from '../../src/common/puppeteer';
import logger from '../../src/common/logger';
import Smtp4Dev from './smtp4dev';

config();

export default class AccountManager {
  private smtp4dev: Smtp4Dev;

  public email: string;

  public username: string;

  public password: string;

  public country: string;

  public totp?: string;

  private addressHost = process.env.CREATION_EMAIL_HOST || '';

  private L: Logger;

  constructor(user?: string, pass?: string, totp?: string, country?: string) {
    if (user) {
      this.username = user;
    } else {
      const randUser = new RandExp(/[0-9a-zA-Z]{8,16}/);
      this.username = randUser.gen();
    }
    if (pass) {
      this.password = pass;
    } else {
      const randPass = new RandExp(/[a-zA-Z]{4,8}[0-9]{3,8}/);
      this.password = randPass.gen();
    }
    this.country = country || 'United States';
    this.totp = totp;
    this.smtp4dev = new Smtp4Dev({
      apiBaseUrl: process.env.SMTP4DEV_URL || '',
    });
    this.email = `${this.username}@${this.addressHost}`;
    this.L = logger.child({
      user,
    });
  }

  public async createAccount(): Promise<void> {
    this.L.info({ username: this.username, password: this.password, email: this.email });

    const hCaptchaCookies = await getHcaptchaCookies();
    const userCookies = await getCookiesRaw(this.email);
    const puppeteerCookies = toughCookieFileStoreToPuppeteerCookie(userCookies);
    this.L.debug('Logging in with puppeteer');
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
    await page.goto(
      `https://www.epicgames.com/id/register/epic?redirect_uri=https://www.epicgames.com/store/en-US/&client_id=${EPIC_CLIENT_ID}`,
      { waitUntil: 'networkidle0' }
    );
    await this.fillDOB(page);
    await this.fillSignUpForm(page);
    await this.fillEmailVerificationForm(page);

    this.L.trace('Saving new cookies');
    const currentUrlCookies = (await cdpClient.send('Network.getAllCookies')) as {
      cookies: Cookie[];
    };
    await browser.close();
    setPuppeteerCookies(this.email, currentUrlCookies.cookies);
    this.L.info({ username: this.username, password: this.password, email: this.email });
  }

  private async fillDOB(page: Page): Promise<void> {
    this.L.trace('Getting date fields');
    const [monthInput, dayInput, yearInput] = await Promise.all([
      page.waitForSelector(`#month`),
      page.waitForSelector(`#day`),
      page.waitForSelector(`#year`),
    ]);
    await monthInput.click();
    const month1 = await page.waitForSelector(`ul.MuiList-root > li`);
    await month1.click();
    await page.waitForTimeout(500); // idk why this is required
    await dayInput.click();
    const day1 = await page.waitForSelector(`ul.MuiList-root > li`);
    await day1.click();
    await yearInput.type(this.getRandomInt(1970, 2002).toString());
    const continueButton = await page.waitForSelector(`#continue:not([disabled])`);
    await page.waitForTimeout(500); // idk why this is required
    this.L.trace('Clicking continueButton');
    await continueButton.click({ delay: 100 });
  }

  private async fillSignUpForm(page: Page): Promise<void> {
    this.L.trace('Getting sign up fields');
    const randName = new RandExp(/[a-zA-Z]{3,12}/);
    const [
      countryInput,
      firstNameInput,
      lastNameInput,
      displayNameInput,
      emailInput,
      passwordInput,
      tosInput,
    ] = await Promise.all([
      page.waitForSelector(`#country`),
      page.waitForSelector(`#name`),
      page.waitForSelector(`#lastName`),
      page.waitForSelector(`#displayName`),
      page.waitForSelector(`#email`),
      page.waitForSelector(`#password`),
      page.waitForSelector(`#tos`),
    ]);
    await countryInput.type(this.country);
    await firstNameInput.type(randName.gen());
    await lastNameInput.type(randName.gen());
    await displayNameInput.type(this.username);
    await emailInput.type(this.email);
    await passwordInput.type(this.password);
    await tosInput.click();
    const submitButton = await page.waitForSelector(`#btn-submit:not([disabled])`);
    this.L.trace('Clicking submitButton');
    await submitButton.click({ delay: 100 });
  }

  private async fillEmailVerificationForm(page: Page): Promise<void> {
    this.L.trace('Working on email verification form');
    const code = await this.getVerification();
    this.L.trace('Waiting for codeInput');
    const codeInput = await page.waitForSelector(`input[name='code-input-0']`);
    await codeInput.click({ delay: 100 });
    await page.keyboard.type(code);
    this.L.trace('Waiting for continueButton');
    const continueButton = await page.waitForSelector(`#continue:not([disabled])`);
    this.L.trace('Clicking continueButton');
    await continueButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  private async getOTP(): Promise<string> {
    this.L.debug('Waiting for OTP email');
    const message = await this.smtp4dev.findNewEmailTo(this.username);
    const emailSource = await this.smtp4dev.getMessageSource(message.id);
    this.L.debug({ emailSource }, 'OTP message');
    // TODO: Parse the email
    const otp = emailSource;
    return otp;
  }

  private async getVerification(): Promise<string> {
    this.L.debug('Waiting for perm verification email');
    const message = await this.smtp4dev.findNewEmailTo(this.username);
    const emailSource = await this.smtp4dev.getMessageSource(message.id);
    writeFileSync('email-source.eml', emailSource, 'utf8');
    const codeRegexp = /\\t\\t([0-9]{6})\\n/g;
    const matches = codeRegexp.exec(emailSource);
    if (!matches) throw new Error('No code matches');
    const code = matches[1].trim();
    this.L.debug({ code }, 'Email code');
    return code;
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
