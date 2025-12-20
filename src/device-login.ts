import axios from 'axios';
import asyncHandler from 'express-async-handler';
import Hashids from 'hashids';
import pTimeout from 'p-timeout';
import urlJoin from 'url-join';

import { config } from './common/config/index.js';
import { ACCOUNT_OAUTH_DEVICE_AUTH, ACCOUNT_OAUTH_TOKEN } from './common/constants.js';
import { getAccountAuth, setAccountAuth } from './common/device-auths.js';
import { getLocaltunnelUrl } from './common/localtunnel.js';
import logger from './common/logger.js';
import { serverRoute } from './common/server.js';
import { NotificationReason } from './interfaces/notification-reason.js';
// eslint-disable-next-line import-x/no-cycle
import { sendNotification } from './notify.js';
import { getGCPExternalIP } from './common/vm.js'

import type { AxiosRequestConfig } from 'axios';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

import type { AuthTokenResponse } from './common/device-auths.js';

export interface ClientCredentialsTokenResponse {
  access_token: string;
  expires_in: number;
  expires_at: string;
  token_type: string;
  client_id: string;
  internal_client: boolean;
  client_service: string;
}

export interface DeviceAuthResponse {
  deviceId: string;
  accountId: string;
  secret: string;
  userAgent: string;
  created: {
    location: string;
    ipAddress: string;
    dateTime: string;
  };
}

export interface DeviceAuthorizationCodeResponse {
  user_code: string;
  device_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  prompt: string;
  expires_in: number;
  interval: number;
  client_id: string;
}

export interface ClientCredentialsError {
  errorCode: string;
  errorMessage: string;
  messageVars: unknown[];
  numericErrorCode: number;
  originatingService: string;
  intent: string;
  error_description: string;
  error: string;
}

export interface DeviceLoginProps {
  user: string;
}

const hashAlphabet = 'abcdefghijklmnopqrstuvwxyz';
const hashLength = 4;
const hashids = new Hashids(Math.random().toString(), hashLength, hashAlphabet);
const timeoutBufferMs = 30 * 1000;

const getUniqueUrl = async (): Promise<{ reqId: string; url: string }> => {
  const baseUrl =
    config.webPortalConfig?.baseUrl
      ? config.webPortalConfig.baseUrl
      : config.webPortalConfig?.vm === 'gcp'
        ? `http://${await getGCPExternalIP()}:3000`
        : 'http://localhost:3000';

  const randInt = Math.floor(Math.random() * hashAlphabet.length ** hashLength);
  const reqId = hashids.encode(randInt);
  const url = urlJoin(baseUrl, `/${reqId}`);
  return { reqId, url };
};

const pendingRedirects = new Map<string, RequestHandler>();

serverRoute.get(
  '/:reqId',
  asyncHandler((req, res, next) => {
    const { reqId } = req.params;
    if (reqId) {
      const reqHandler = pendingRedirects.get(reqId);
      if (reqHandler) {
        reqHandler(req, res, next);
        return;
      }
    }
    logger.error({ reqId }, 'No pending redirect found');
    res.status(404);
  }),
);

export class DeviceLogin {
  private user: string;

  private L: Logger;

  constructor(props: DeviceLoginProps) {
    this.user = props.user;
    this.L = logger.child({
      user: this.user,
    });
  }

  public async testServerNotify(): Promise<void> {
    const { reqId, url } = await getUniqueUrl();
    const notificationTimeout = config.getMsUntilNextRun() - timeoutBufferMs;

    logger.trace(
      { notificationTimeout: `in ${(notificationTimeout / (60 * 1000)).toFixed(1)} minutes` },
      'Awaiting test notification response',
    );

    // Wait on a promise to be resolved by the web redirect completing
    await Promise.all([
      pTimeout(
        new Promise((resolve, reject) => {
          pendingRedirects.set(reqId, this.onTestVisit(resolve, reject).bind(this));
        }),
        {
          milliseconds: notificationTimeout,
          message: 'Test notification timed out',
        },
      ),
      this.notify(NotificationReason.TEST, url),
    ]);
    pendingRedirects.delete(reqId);
  }

  public async newDeviceAuthLogin(): Promise<void> {
    const { reqId, url } = await getUniqueUrl();
    const notificationTimeout = config.getMsUntilNextRun() - timeoutBufferMs;

    logger.trace(
      { notificationTimeout: `in ${(notificationTimeout / (60 * 1000)).toFixed(1)} minutes` },
      'Awaiting login notification response',
    );

    // Wait on a promise to be resolved by the web redirect and login completing
    await Promise.all([
      pTimeout(
        new Promise((resolve, reject) => {
          pendingRedirects.set(reqId, this.onLoginVisit(resolve, reject).bind(this));
        }),
        {
          milliseconds: notificationTimeout,
          message: 'Device login timed out',
        },
      ),
      this.notify(NotificationReason.LOGIN, url),
    ]);
    pendingRedirects.delete(reqId);
  }

  private async notify(reason: NotificationReason, inUrl: string): Promise<void> {
    let url: string;

    if (config.webPortalConfig?.localtunnel) {
      url = await getLocaltunnelUrl(inUrl);
    } else {
      url = inUrl;
    }

    this.L.info({ reason, url }, 'Dispatching notification');
    await sendNotification(this.user, reason, url);
  }

  private async startDeviceAuthorization(): Promise<DeviceAuthorizationCodeResponse> {
    const clientCredentialsToken = await this.getClientCredentialsToken();
    return this.getDeviceAuthorizationCode(clientCredentialsToken.access_token);
  }

  private onLoginVisit =
    (resolve: (value: unknown) => void, reject: (reason?: Error) => void): RequestHandler =>
    async (_req, res) => {
      try {
        const deviceAuthorizationCodeResponse = await this.startDeviceAuthorization();
        // Redirect user to Epic Games login page
        const verificationUrl = deviceAuthorizationCodeResponse.verification_uri_complete;
        this.L.debug({ verificationUrl }, 'Redirecting request to Epic Login URL');
        res.redirect(verificationUrl);
        // Wait for user to complete Epic Games login
        const deviceCodeResponse = await this.waitForDeviceAuthorization(
          deviceAuthorizationCodeResponse,
        );
        // TODO: check that the user matches, only possible with accountId hash
        this.L.info('Successful login, saving auth token');
        await setAccountAuth(this.user, deviceCodeResponse);
        resolve(undefined);
      } catch (err) {
        reject(err);
      }
    };

  private onTestVisit =
    (resolve: (value: unknown) => void, reject: (reason?: Error) => void): RequestHandler =>
    async (_req, res) => {
      try {
        res.redirect('https://example.com/');
        this.L.info('Successful tested redirect');
        resolve(undefined);
      } catch (err) {
        reject(err);
      }
    };

  public async refreshDeviceAuth(): Promise<boolean> {
    try {
      const existingAuth = await getAccountAuth(this.user);
      this.L.trace(
        {
          existingAuthRefreshExpiry: existingAuth?.refresh_expires_at,
          existingAuthAccessExpiry: existingAuth?.expires_at,
        },
        'Pre-refresh auth expiry',
      );
      if (!(existingAuth && new Date(existingAuth.refresh_expires_at) > new Date())) return false;

      const reqConfig: AxiosRequestConfig = {
        method: 'POST',
        url: ACCOUNT_OAUTH_TOKEN,
        data: { grant_type: 'refresh_token', refresh_token: existingAuth.refresh_token },
        auth: {
          username: config.deviceAuthClientId,
          password: config.deviceAuthSecret,
        },
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      };
      this.L.trace({ reqConfig }, 'Refreshing device token');

      const resp = await axios.request<AuthTokenResponse>(reqConfig);
      this.L.debug({ authResp: resp.data }, 'Refresh auth token response');
      await setAccountAuth(this.user, resp.data);
      return true;
    } catch (err) {
      this.L.warn({ err }, 'Failed to refresh auth, getting it fresh');
    }
    return false;
  }

  private async getClientCredentialsToken(): Promise<ClientCredentialsTokenResponse> {
    const reqConfig: AxiosRequestConfig = {
      method: 'POST',
      url: ACCOUNT_OAUTH_TOKEN,
      data: { grant_type: 'client_credentials' },
      auth: {
        username: config.deviceAuthClientId,
        password: config.deviceAuthSecret,
      },
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    };
    this.L.trace({ reqConfig }, 'Getting client credentials token');
    const resp = await axios.request<ClientCredentialsTokenResponse>(reqConfig);
    return resp.data;
  }

  private async getDeviceAuthorizationCode(
    clientCredentialsToken: string,
  ): Promise<DeviceAuthorizationCodeResponse> {
    const reqConfig: AxiosRequestConfig = {
      method: 'POST',
      url: ACCOUNT_OAUTH_DEVICE_AUTH,
      params: { prompt: 'login' },
      headers: { Authorization: `Bearer ${clientCredentialsToken}` },
    };
    this.L.trace({ reqConfig }, 'Getting device authorization verification URL');
    const resp = await axios.request<DeviceAuthorizationCodeResponse>(reqConfig);
    return resp.data;
  }

  private async waitForDeviceAuthorization(
    deviceCodeResp: DeviceAuthorizationCodeResponse,
    inExpiresAt?: Date,
  ): Promise<AuthTokenResponse> {
    let expiresAt: Date;
    const now = new Date();
    if (inExpiresAt) {
      expiresAt = inExpiresAt;
    } else {
      now.setSeconds(now.getSeconds() + deviceCodeResp.expires_in);
      expiresAt = now;
    }

    if (expiresAt < now) throw new Error('Device code login expired');

    try {
      const reqConfig: AxiosRequestConfig = {
        method: 'POST',
        url: ACCOUNT_OAUTH_TOKEN,
        data: { grant_type: 'device_code', device_code: deviceCodeResp.device_code },
        auth: {
          username: config.deviceAuthClientId,
          password: config.deviceAuthSecret,
        },
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      };
      this.L.trace({ reqConfig }, 'Checking for device code verification');
      const resp = await axios.request<AuthTokenResponse>(reqConfig);
      this.L.debug({ authResp: resp.data }, 'Auth token response');
      return resp.data;
    } catch (err) {
      if (!axios.isAxiosError<ClientCredentialsError>(err)) {
        throw new Error('Unable to get device authorization token');
      }
      if (
        err.response?.data.errorCode !== 'errors.com.epicgames.account.oauth.authorization_pending'
      ) {
        this.L.error({ err, response: err.response?.data });
        throw new Error('Unable to get device authorization token');
      }
      await new Promise((resolve) => {
        setTimeout(resolve, config.deviceAuthPollRateSeconds * 1000);
      });
      return this.waitForDeviceAuthorization(deviceCodeResp, expiresAt);
    }
  }
}
