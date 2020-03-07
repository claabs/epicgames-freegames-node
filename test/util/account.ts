/* eslint-disable no-console */
import * as RandExp from 'randexp';
import * as cookieParser from 'set-cookie-parser';
import { v4 as uuid } from 'uuid';
import * as qs from 'qs';
import { config } from 'dotenv';
import { login, setupSid } from '../../src/index';
import TempMail from './temp-mail';
import PermMail from './perm-mail';
import axios from '../../src/common/axios';
import { getCaptchaSessionToken, EpicArkosePublicKey } from '../../src/captcha';
import { CSRFSetCookies } from '../../src/types';

config();

interface CreateAccountRequest {
  country: string;
  name: string;
  lastName: string;
  displayName: string;
  email: string;
  password: string;
  captcha: string;
  createdForClientId: string; // 875a3b57d3a640a6b7f9b4e883463ab4
  dateOfBirth: string; // '1990-01-01'
}

interface ChangeEmailInitialRequest {
  requestType: string;
}

interface ChangeEmailVerifyRequest extends ChangeEmailInitialRequest {
  email: string;
  otp: string;
  deviceId: string;
  challenge: string;
  method: string;
}

interface UserInfoResponse {
  userInfo: {
    id: {
      value: string;
    };
    displayName: {
      id: {
        value: string;
      };
    };
    // And much more
  };
}

const CSRF_ENDPOINT = 'https://www.epicgames.com/id/api/csrf';
// const RESEND_VERIFICATION_ENDPOINT = 'https://www.epicgames.com/account/v2/resendEmailVerification';
const CHANGE_EMAIL_ENDPOINT = 'https://www.epicgames.com/account/v2/api/email/change';
const USER_INFO_ENDPOINT = 'https://www.epicgames.com/account/v2/personal/ajaxGet';
const CLIENT_ID = '875a3b57d3a640a6b7f9b4e883463ab4';

export default class AccountManager {
  private tempMail: TempMail;

  private permMail: PermMail;

  private permMailAddress: string;

  private username: string;

  private password: string;

  private accountId = '';

  constructor(user?: string, pass?: string) {
    if (user) {
      this.username = user;
    } else {
      const randUser = new RandExp(/[0-9a-zA-Z-]{8,16}/);
      this.username = randUser.gen();
    }
    if (pass) {
      this.password = pass;
    } else {
      const randPass = new RandExp(/[a-zA-Z]{4,8}[0-9]{3,8}/);
      this.password = randPass.gen();
    }
    this.tempMail = new TempMail({
      username: this.username,
    });
    this.permMail = new PermMail();
    this.permMailAddress = `${this.permMail.addressName}+${this.username}@${this.permMail.addressHost}`;
  }

  public async init(): Promise<void> {
    await this.tempMail.init();
    console.log('USER:', this.username);
    console.log('PASSWORD:', this.password);
    console.log('PERM EMAIL:', this.permMailAddress);
    console.log('TEMP EMAIL:', this.tempMail.emailAddress);
    return this.createAccount(this.permMailAddress, this.password);
  }

  public async createAccount(email: string, password: string, attempt = 0): Promise<void> {
    const captchaToken = await getCaptchaSessionToken(EpicArkosePublicKey.CREATE);
    const csrfResp = await axios.get(CSRF_ENDPOINT);
    const cookies = (cookieParser(csrfResp.headers['set-cookie'], {
      map: true,
    }) as unknown) as CSRFSetCookies;
    const csrfToken = cookies['XSRF-TOKEN'].value;
    if (attempt > 5) {
      throw new Error('Too many creation attempts');
    }

    const randName = new RandExp(/[a-zA-Z]{3,12}/);
    const createBody: CreateAccountRequest = {
      dateOfBirth: '1990-01-01', // TODO
      country: 'US',
      name: randName.gen(),
      lastName: randName.gen(),
      createdForClientId: CLIENT_ID,
      displayName: this.username,
      password: this.password,
      captcha: captchaToken,
      email,
    };
    try {
      await axios.post('https://www.epicgames.com/id/api/account', createBody, {
        headers: {
          'x-xsrf-token': csrfToken,
        },
      });
      console.log('ACCOUNT CREATED');
    } catch (e) {
      if (e.response.data.errorCode === 'errors.com.epicgames.accountportal.session_invalidated') {
        console.log('Session invalidated, retrying');
        await this.createAccount(email, password, attempt + 1);
      } else if (
        e.response.data.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid' ||
        (e.response.data.errorCode === 'errors.com.epicgames.accountportal.validation.required' &&
          e.response.data.message === 'captcha is required')
      ) {
        console.warn('Captcha required');
        await this.createAccount(email, password, attempt + 1);
      } else {
        console.error('ACCOUNT CREATION FAILED:', e.response.data);
        throw e;
      }
    }
  }

  /**
   * This is currently broken. Development has been halted thanks to Epic not checking for plus-suffix email addresses.
   */
  public async changeEmail(): Promise<void> {
    const initialChangeBody: ChangeEmailInitialRequest = {
      requestType: 'challenge',
    };
    console.debug('Calling initial change');
    try {
      await axios.post(CHANGE_EMAIL_ENDPOINT, qs.stringify(initialChangeBody), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const otp = await this.getPermOTP();
      console.debug('Getting account ID');
      await this.getAccountId();
      const verifyChangeBody: ChangeEmailVerifyRequest = {
        requestType: 'challenge_verify_and_proceed',
        otp,
        email: this.tempMail.emailAddress,
        method: 'email',
        deviceId: uuid(),
        // Need to figure out of these UUIDs matter
        challenge: Buffer.from(`${this.accountId}.${uuid()}.accountManagementEmailChange`).toString(
          'base64'
        ),
      };
      console.debug('Calling verify change', verifyChangeBody);
      await axios.post(CHANGE_EMAIL_ENDPOINT, qs.stringify(verifyChangeBody), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      await this.getTempVerification();
    } catch (err) {
      console.error(err.request);
      console.error(err.response.data);
      throw err;
    }
  }

  public async login(): Promise<void> {
    return login(this.permMailAddress, this.password);
  }

  private async getPermOTP(): Promise<string> {
    console.debug('(getPermOTP) Waiting for email');
    const email = await this.permMail.waitForEmail();
    if (!email || !email.source) throw new Error('Empty email');
    const message = email.source.toString();
    console.log('OTP message', message);
    // TODO: Parse the email
    const otp = message;
    return otp;
  }

  private async getTempVerification(): Promise<void> {
    console.debug('(getTempVerification) Waiting for email');
    const email = await this.tempMail.waitForEmails();
    if (email.length < 1) throw new Error('Empty email');
    const message = email[0].mail_body;
    console.log('Verify message', message);
    // TODO: Parse the email
    const link = message;
    return axios.get(link);
  }

  private async getAccountId(): Promise<void> {
    await setupSid();
    const userInfo = await axios.get<UserInfoResponse>(USER_INFO_ENDPOINT);
    this.accountId = userInfo.data.userInfo.id.value;
  }
}
