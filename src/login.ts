import cookieParser from 'set-cookie-parser';
import { TOTP } from 'otpauth';
import L from './common/logger';
import request from './common/request';
import { CSRFSetCookies, LoginBody, RedirectResponse, MFABody } from './interfaces/types';
import { notifyManualCaptcha, EpicArkosePublicKey } from './captcha';
import {
  CSRF_ENDPOINT,
  LOGIN_ENDPOINT,
  EPIC_CLIENT_ID,
  REDIRECT_ENDPOINT,
  REPUTATION_ENDPOINT,
  EMAIL_VERIFY,
  STORE_HOMEPAGE,
  MFA_LOGIN_ENDPOINT,
  SET_SID_ENDPOINT,
} from './common/constants';
import { config } from './common/config';

export async function getCsrf(): Promise<string> {
  L.debug('Refreshing CSRF');
  L.trace({ url: CSRF_ENDPOINT }, 'CSRF request');
  const csrfResp = await request.client.get(CSRF_ENDPOINT);
  const cookies = (cookieParser(csrfResp.headers['set-cookie'] as string[], {
    map: true,
  }) as unknown) as CSRFSetCookies;
  return cookies['XSRF-TOKEN'].value;
}

export async function getReputation(): Promise<void> {
  L.trace({ url: REPUTATION_ENDPOINT }, 'Reputation request');
  await request.client.get(REPUTATION_ENDPOINT);
}

export async function loginMFA(totpSecret?: string): Promise<void> {
  L.debug('Logging in with MFA');
  if (!totpSecret) throw new Error('TOTP required for MFA login');
  const csrfToken = await getCsrf();
  const totp = new TOTP({ secret: totpSecret });
  const mfaRequest: MFABody = {
    code: totp.generate(),
    method: 'authenticator',
    rememberDevice: true,
  };
  L.trace({ body: mfaRequest, url: MFA_LOGIN_ENDPOINT }, 'MFA request');
  await request.client.post(MFA_LOGIN_ENDPOINT, {
    json: mfaRequest,
    headers: {
      'x-xsrf-token': csrfToken,
    },
  });
}

export async function sendVerify(code: string): Promise<void> {
  const csrfToken = await getCsrf();
  const verifyBody = {
    verificationCode: code,
  };
  L.trace({ body: verifyBody, url: EMAIL_VERIFY }, 'Verify email request');
  await request.client.post(EMAIL_VERIFY, {
    json: verifyBody,
    headers: {
      'x-xsrf-token': csrfToken,
    },
  });
}

export async function login(
  email: string,
  password: string,
  captcha = '',
  totp = '',
  attempt = 0
): Promise<void> {
  L.debug({ email, captcha, attempt }, 'Attempting login');
  const csrfToken = await getCsrf();
  if (attempt > 5) {
    throw new Error('Too many login attempts');
  }
  const loginBody: LoginBody = {
    password,
    rememberMe: true,
    captcha,
    email,
  };
  try {
    L.trace({ body: loginBody, url: LOGIN_ENDPOINT }, 'Login request');
    await request.client.post(LOGIN_ENDPOINT, {
      json: loginBody,
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
    L.debug('Logged in');
  } catch (e) {
    if (e.response && e.response.body && e.response.body.errorCode) {
      if (e.response.body.errorCode.includes('session_invalidated')) {
        L.debug('Session invalidated, retrying');
        await login(email, password, captcha, totp, attempt + 1);
      } else if (
        e.response.body.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid'
      ) {
        L.debug('Captcha required');
        const captchaToken = await notifyManualCaptcha(EpicArkosePublicKey.LOGIN);
        await login(email, password, captchaToken, totp, attempt + 1);
      } else if (
        e.response.body.errorCode ===
        'errors.com.epicgames.common.two_factor_authentication.required'
      ) {
        await loginMFA(totp);
      } else {
        L.error(e.response.body, 'Login failed');
        throw e;
      }
    } else {
      L.error(e, 'Login failed');
      throw e;
    }
  }
}

/**
 * Sets the 'store-token' cookie which is necessary to authenticate on the GraphQL proxy endpoint
 */
export async function getStoreToken(): Promise<void> {
  L.trace({ url: STORE_HOMEPAGE }, 'Request store homepage');
  const resp = await request.client.get(STORE_HOMEPAGE, { responseType: 'text' });
  L.trace({ headers: resp.headers }, 'Store homepage response headers');
}

export async function refreshAndSid(error: boolean): Promise<boolean> {
  L.debug('Setting SID');
  const csrfToken = await getCsrf();
  const redirectSearchParams = { clientId: EPIC_CLIENT_ID, redirectUrl: STORE_HOMEPAGE };
  L.trace({ params: redirectSearchParams, url: REDIRECT_ENDPOINT }, 'Redirect request');
  const redirectResp = await request.client.get<RedirectResponse>(REDIRECT_ENDPOINT, {
    headers: {
      'x-xsrf-token': csrfToken,
    },
    searchParams: redirectSearchParams,
  });
  const { sid } = redirectResp.body;
  if (!sid) {
    if (error) throw new Error('Sid returned null');
    return false;
  }
  const sidSearchParams = { sid };
  L.trace({ params: sidSearchParams, url: SET_SID_ENDPOINT }, 'Set SID request');
  const sidResp = await request.client.get(SET_SID_ENDPOINT, { searchParams: sidSearchParams });
  L.trace({ headers: sidResp.headers }, 'Set SID response headers');
  await getStoreToken();
  return true;
}

export async function fullLogin(
  email = config.accounts[0].email,
  password = config.accounts[0].password,
  totp = config.accounts[0].totp
): Promise<void> {
  if (await refreshAndSid(false)) {
    L.info('Successfully refreshed login');
  } else {
    L.debug('Could not refresh credentials. Logging in fresh.');
    await getReputation();
    await login(email, password, '', totp);
    await refreshAndSid(true);
    L.info('Successfully logged in fresh');
  }
}
