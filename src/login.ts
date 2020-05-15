import cookieParser from 'set-cookie-parser';
import { TOTP } from 'otpauth';
import L from './common/logger';
import request from './common/request';
import { CSRFSetCookies, LoginBody, RedirectResponse, MFABody } from './interfaces/types';
import { getCaptchaSessionToken, EpicArkosePublicKey } from './captcha';
import {
  CSRF_ENDPOINT,
  LOGIN_ENDPOINT,
  EPIC_CLIENT_ID,
  REDIRECT_ENDPOINT,
  REPUTATION_ENDPOINT,
} from './common/constants';

export const EMAIL = process.env.EMAIL || 'missing@email.com';
export const PASSWORD = process.env.PASSWORD || 'missing-password';

export async function getCsrf(): Promise<string> {
  const csrfResp = await request.get(CSRF_ENDPOINT);
  const cookies = (cookieParser(csrfResp.headers['set-cookie'] as string[], {
    map: true,
  }) as unknown) as CSRFSetCookies;
  return cookies['XSRF-TOKEN'].value;
}

export async function getReputation(): Promise<void> {
  await request.get(REPUTATION_ENDPOINT);
}

export async function loginMFA(): Promise<void> {
  L.debug('Logging in with MFA');
  if (!process.env.TOTP) throw new Error('TOTP required for MFA login');
  const totpSecret = process.env.TOTP;
  const csrfToken = await getCsrf();
  const totp = new TOTP({ secret: totpSecret });
  const mfaRequest: MFABody = {
    code: totp.generate(),
    method: 'authenticator',
    rememberDevice: true,
  };
  L.debug({ mfaRequest }, 'MFA Request');
  await request.post('https://www.epicgames.com/id/api/login/mfa', {
    json: mfaRequest,
    headers: {
      'x-xsrf-token': csrfToken,
    },
  });
}

export async function login(
  email: string,
  password: string,
  captcha = '',
  attempt = 0
): Promise<void> {
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
    await request.post(LOGIN_ENDPOINT, {
      json: loginBody,
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
    L.info('Logged in');
  } catch (e) {
    if (e.response.body.errorCode.includes('session_invalidated')) {
      L.debug('Session invalidated, retrying');
      await login(email, password, captcha, attempt + 1);
    } else if (e.response.body.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid') {
      L.debug('Captcha required');
      const captchaToken = await getCaptchaSessionToken(EpicArkosePublicKey.LOGIN);
      await login(email, password, captchaToken, attempt + 1);
    } else if (
      e.response.body.errorCode === 'errors.com.epicgames.common.two_factor_authentication.required'
    ) {
      await loginMFA();
    } else {
      L.error(e.response.body, 'Login failed');
      throw e;
    }
  }
}

export async function refreshAndSid(error: boolean): Promise<boolean> {
  const csrfToken = await getCsrf();
  const redirectResp = await request.get<RedirectResponse>(REDIRECT_ENDPOINT, {
    headers: {
      'x-xsrf-token': csrfToken,
    },
    searchParams: {
      clientId: EPIC_CLIENT_ID,
      redirectUrl: `https://www.epicgames.com/store/en-US/`,
    },
  });
  const { sid } = redirectResp.body;
  if (!sid) {
    if (error) throw new Error('Sid returned null');
    return false;
  }
  await request.get('https://www.unrealengine.com/id/api/set-sid', {
    searchParams: {
      sid,
    },
  });
  return true;
}

export async function fullLogin(): Promise<void> {
  if (await refreshAndSid(false)) {
    L.info('Successfully refreshed login');
  } else {
    L.debug('Could not refresh credentials. Logging in fresh.');
    await getReputation();
    await login(EMAIL, PASSWORD);
    await refreshAndSid(true);
  }
}
