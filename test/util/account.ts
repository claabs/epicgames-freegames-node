// Import dotenv config before all other imports, so ENV variables are loaded for all imports
import 'dotenv/config';

/* eslint-disable class-methods-use-this */
import RandExp from 'randexp';
import cookieParser from 'set-cookie-parser';
import { v4 as uuid } from 'uuid';
import { TOTP } from 'otpauth';
import { Got } from 'got/dist/source';
import L from '../../src/common/logger';
import Login from '../../src/login';
import TempMail from './temp-mail';
import PermMail from './perm-mail';
import { newCookieJar } from '../../src/common/request';
import { notifyManualCaptcha } from '../../src/captcha';
import { CSRFSetCookies } from '../../src/interfaces/types';
import {
  EPIC_CLIENT_ID,
  CHANGE_EMAIL_ENDPOINT,
  USER_INFO_ENDPOINT,
  SETUP_MFA,
  ACCOUNT_CSRF_ENDPOINT,
  ACCOUNT_SESSION_ENDPOINT,
} from '../../src/common/constants';
import '../../src/site/app';

interface CreateAccountRequest {
  country: string;
  name: string;
  lastName: string;
  displayName: string;
  email: string;
  password: string;
  captcha?: string;
  createdForClientId?: string; // 875a3b57d3a640a6b7f9b4e883463ab4
  dateOfBirth?: string; // '1990-01-01'
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

interface MFASetupResponse {
  isSuccess: boolean;
  settings: null;
  type: string;
  enabled: string;
  verify: {
    otpauth: string;
    secret: string; // Use this one
    challenge: string;
    errorCode: string;
  };
  requiresVerification: boolean;
  error: null;
}

export default class AccountManager {
  private tempMail: TempMail;

  private permMail: PermMail;

  public permMailAddress: string;

  public username: string;

  public password: string;

  public totp?: string;

  private accountId = '';

  private request: Got;

  private loginClient: Login;

  constructor(user?: string, pass?: string, totp?: string) {
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
    this.totp = totp;
    this.tempMail = new TempMail({
      username: this.username,
    });
    this.permMail = new PermMail();
    this.permMailAddress = `${this.permMail.addressName}+${this.username}@${this.permMail.addressHost}`;
    this.request = newCookieJar(this.permMailAddress);
    this.loginClient = new Login(this.request, this.permMailAddress);
  }

  public async init(): Promise<void> {
    await this.tempMail.init();
    L.info({ username: this.username, password: this.password, email: this.permMailAddress });
    await this.createAccount(this.permMailAddress, this.password);
  }

  public async createAccount(
    email: string,
    password: string,
    attempt = 0,
    captcha?: string
  ): Promise<void> {
    if (attempt > 5) {
      throw new Error('Too many creation attempts');
    }
    const csrfToken = await this.loginClient.getCsrf();

    const randName = new RandExp(/[a-zA-Z]{3,12}/);
    const createBody: CreateAccountRequest = {
      dateOfBirth: '1990-01-01', // TODO
      country: 'US',
      name: randName.gen(),
      lastName: randName.gen(),
      createdForClientId: EPIC_CLIENT_ID,
      displayName: this.username,
      password: this.password,
      captcha,
      email,
    };
    try {
      L.debug({ createBody }, 'account POST');
      await this.request.post('https://www.epicgames.com/id/api/account', {
        json: createBody,
        headers: {
          'x-xsrf-token': csrfToken,
        },
      });
      await this.enableMFA();
      L.info(
        {
          email: this.permMailAddress,
          password: this.password,
          username: this.username,
          totp: this.totp,
        },
        'Account created'
      );
    } catch (e) {
      if (e.response && e.response.body && e.response.body.errorCode) {
        L.debug({ body: e.response.body }, 'Error body');
        if (e.response.body.errorCode.includes('session_invalidated')) {
          L.debug('Session invalidated, retrying');
          await this.createAccount(email, password, attempt + 1, captcha);
        } else if (
          e.response.body.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid' ||
          (e.response.body.errorCode === 'errors.com.epicgames.accountportal.validation.required' &&
            e.response.body.message === 'captcha is required')
        ) {
          L.debug('Captcha required');
          const newCaptcha = await notifyManualCaptcha(this.permMailAddress, csrfToken);
          await this.createAccount(email, password, attempt + 1, newCaptcha);
        } else if (e.response.body.errorCode.includes('email_verification_required')) {
          const code = await this.getPermVerification();
          await this.loginClient.sendVerify(code);
          await this.createAccount(email, password, attempt + 1, captcha);
        } else {
          L.error(e.response.body, 'Account creation failed');
          throw e;
        }
      }
      L.error(e, 'Account creation failed');
      throw e;
    }
  }

  private async accountCsrf(): Promise<string> {
    const csrfResp = await this.request.post(ACCOUNT_CSRF_ENDPOINT);
    L.debug({ headers: csrfResp.headers });
    const cookies = (cookieParser(csrfResp.headers['set-cookie'] as string[], {
      map: true,
    }) as unknown) as CSRFSetCookies;
    return cookies['XSRF-AM-TOKEN'].value;
  }

  private async startAccountSession(): Promise<void> {
    await this.request.get(ACCOUNT_SESSION_ENDPOINT, {
      responseType: 'text',
      headers: {
        'content-type': 'text/html',
      },
      searchParams: {
        productName: 'epicgames',
        lang: 'en',
      },
    });
  }

  private async enableMFA(): Promise<void> {
    L.info('Enabling MFA');
    await this.loginClient.fullLogin(this.permMailAddress, this.password);
    L.debug('Getting account client cookies');
    await this.startAccountSession();
    L.debug('Getting account CSRF');
    const csrfToken = await this.accountCsrf();
    L.debug('Requesting MFA setup');
    const resp = await this.request.post<MFASetupResponse>(SETUP_MFA, {
      form: {
        type: 'authenticator',
        enabled: 'true',
      },
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
    const { challenge } = resp.body.verify;
    this.totp = resp.body.verify.secret;
    const totp = new TOTP({ secret: this.totp });
    L.debug('Verifying MFA setup');
    await this.request.post<MFASetupResponse>(SETUP_MFA, {
      form: {
        type: 'authenticator',
        enabled: 'true',
        otp: totp.generate(),
        challenge,
      },
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
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
      await this.request.post(CHANGE_EMAIL_ENDPOINT, {
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
      await this.request.post(CHANGE_EMAIL_ENDPOINT, {
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
    return this.loginClient.fullLogin(this.permMailAddress, this.password, this.totp);
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
    // return this.request.get(link);
  }

  private async getPermVerification(): Promise<string> {
    L.debug('Waiting for perm verification email');
    const email = await this.permMail.waitForEmail();
    if (!email || !email.source) throw new Error('Empty email');
    const source = email.source.toString();
    const matches = source.match(/[\r\n]([0-9]{6})[\r\n]/g);
    if (!matches) throw new Error('No code matches');
    const code = matches[0].trim();
    L.debug({ code }, 'Email code');
    return code;
  }

  private async getAccountId(): Promise<void> {
    await this.loginClient.refreshAndSid(true);
    const userInfo = await this.request.get<UserInfoResponse>(USER_INFO_ENDPOINT);
    this.accountId = userInfo.body.userInfo.id.value;
  }
}
