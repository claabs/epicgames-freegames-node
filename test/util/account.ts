import RandExp from 'randexp';
import cookieParser from 'set-cookie-parser';
import { v4 as uuid } from 'uuid';
import { config } from 'dotenv';
import L from '../../src/common/logger';
import { login, setupSid } from '../../src/index';
import TempMail from './temp-mail';
import PermMail from './perm-mail';
import request from '../../src/common/request';
import { getCaptchaSessionToken, EpicArkosePublicKey } from '../../src/captcha';
import { CSRFSetCookies } from '../../src/interfaces/types';

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
    L.info({ username: this.username });
    L.info({ password: this.password });
    L.info({ permMailAddress: this.permMailAddress });
    L.info({ tempMailAddress: this.tempMail.emailAddress });
    return this.createAccount(this.permMailAddress, this.password);
  }

  public async createAccount(email: string, password: string, attempt = 0): Promise<void> {
    const captchaToken = await getCaptchaSessionToken(EpicArkosePublicKey.CREATE);
    const csrfResp = await request.get(CSRF_ENDPOINT);
    const cookies = (cookieParser(csrfResp.headers['set-cookie'] as string[], {
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
      await request.post('https://www.epicgames.com/id/api/account', {
        json: createBody,
        headers: {
          'x-xsrf-token': csrfToken,
        },
      });
      L.info('Account created');
    } catch (e) {
      if (e.response.body.errorCode === 'errors.com.epicgames.accountportal.session_invalidated') {
        L.debug('Session invalidated, retrying');
        await this.createAccount(email, password, attempt + 1);
      } else if (
        e.response.body.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid' ||
        (e.response.body.errorCode === 'errors.com.epicgames.accountportal.validation.required' &&
          e.response.body.message === 'captcha is required')
      ) {
        L.debug('Captcha required');
        await this.createAccount(email, password, attempt + 1);
      } else {
        L.error(e.response.body, 'Account creation failed');
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
    L.debug('Calling initial change');
    try {
      await request.post(CHANGE_EMAIL_ENDPOINT, {
        form: initialChangeBody,
      });
      const otp = await this.getPermOTP();
      L.debug('Getting account ID');
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
      L.debug('Calling verify change', verifyChangeBody);
      await request.post(CHANGE_EMAIL_ENDPOINT, {
        form: verifyChangeBody,
      });
      await this.getTempVerification();
    } catch (err) {
      L.error(err.request);
      L.error(err.response.body);
      throw err;
    }
  }

  public async login(): Promise<void> {
    return login(this.permMailAddress, this.password);
  }

  private async getPermOTP(): Promise<string> {
    L.debug('Waiting for OTP email');
    const email = await this.permMail.waitForEmail();
    if (!email || !email.source) throw new Error('Empty email');
    const message = email.source.toString();
    L.debug({ message }, 'OTP message');
    // TODO: Parse the email
    const otp = message;
    return otp;
  }

  private async getTempVerification(): Promise<void> {
    L.debug('Waiting for temp verification email');
    const email = await this.tempMail.waitForEmails();
    if (email.length < 1) throw new Error('Empty email');
    const message = email[0].mail_body;
    L.debug({ message }, 'Verify message');
    // TODO: Parse the email
    // const link = message;
    // return request.get(link);
  }

  private async getAccountId(): Promise<void> {
    await setupSid();
    const userInfo = await request.get<UserInfoResponse>(USER_INFO_ENDPOINT);
    this.accountId = userInfo.body.userInfo.id.value;
  }
}
