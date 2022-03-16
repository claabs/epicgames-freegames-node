import { Got } from 'got';
import { Logger } from 'pino';
import logger from './common/logger';
import { RedirectResponse, ReputationData } from './interfaces/types';
import {
  EPIC_CLIENT_ID,
  REDIRECT_ENDPOINT,
  REPUTATION_ENDPOINT,
  STORE_HOMEPAGE,
  AUTHENTICATE_ENDPOINT,
  CLIENT_REDIRECT_ENDPOINT,
  LOCATION_ENDPOINT,
  TWINMOTION_SET_SID_ENDPOINT,
  UNREAL_SET_SID_ENDPOINT,
  STORE_HOMEPAGE_EN,
} from './common/constants';
import { config } from './common/config';
import PuppetLogin from './puppet/login';

export default class Login {
  private request: Got;

  private L: Logger;

  constructor(requestClient: Got, email: string) {
    this.request = requestClient;
    this.L = logger.child({
      user: email,
    });
  }

  async getReputation(): Promise<ReputationData> {
    this.L.trace({ url: REPUTATION_ENDPOINT }, 'Reputation request');
    const resp = await this.request.get<ReputationData>(REPUTATION_ENDPOINT);
    return resp.body;
  }

  async getLocation(): Promise<void> {
    this.L.trace({ url: LOCATION_ENDPOINT }, 'Location request');
    await this.request.get<ReputationData>(LOCATION_ENDPOINT);
  }

  /**
   * Sets the 'store-token' cookie which is necessary to authenticate on the GraphQL proxy endpoint
   */
  async getStoreToken(): Promise<void> {
    this.L.trace({ url: STORE_HOMEPAGE_EN }, 'Request store homepage');
    const resp = await this.request.get(STORE_HOMEPAGE_EN, { responseType: 'text' });
    this.L.trace({ setCookie: resp.headers?.['set-cookie'] }, 'Store homepage response cookies');
  }

  async refreshAndSid(error: boolean): Promise<boolean> {
    this.L.debug('Refreshing login session');
    await this.getStoreToken();

    await this.getReputation();
    await this.getLocation();
    // const csrfToken = await this.getCsrf();

    const clientRedirectSearchParams = { redirectUrl: STORE_HOMEPAGE };
    this.L.trace(
      { params: clientRedirectSearchParams, url: CLIENT_REDIRECT_ENDPOINT },
      'Client redirect request'
    );
    const clientRedirectResp = await this.request.get(CLIENT_REDIRECT_ENDPOINT, {
      searchParams: clientRedirectSearchParams,
    });
    this.L.trace({ resp: clientRedirectResp.body }, 'Client redirect response');

    this.L.trace({ url: AUTHENTICATE_ENDPOINT }, 'Authenticate request');
    const authenticateResp = await this.request.get(AUTHENTICATE_ENDPOINT);
    this.L.trace({ resp: authenticateResp.body }, 'Authenticate response');

    const redirectSearchParams = {
      clientId: EPIC_CLIENT_ID,
      redirectUrl: STORE_HOMEPAGE_EN,
      prompt: 'pass_through',
    };
    this.L.trace({ params: redirectSearchParams, url: REDIRECT_ENDPOINT }, 'Redirect request');
    const redirectResp = await this.request.get<RedirectResponse>(REDIRECT_ENDPOINT, {
      searchParams: redirectSearchParams,
    });
    this.L.trace({ resp: redirectResp.body }, 'Redirect response');
    const { sid } = redirectResp.body;
    if (!sid) {
      if (error) throw new Error('Sid returned null');
      return false;
    }
    const sidSearchParams = { sid };
    this.L.trace(
      { params: sidSearchParams, urls: [UNREAL_SET_SID_ENDPOINT, TWINMOTION_SET_SID_ENDPOINT] },
      'Set SID requests'
    );
    const sidResps = await Promise.all([
      this.request.get(UNREAL_SET_SID_ENDPOINT, { searchParams: sidSearchParams }),
      this.request.get(TWINMOTION_SET_SID_ENDPOINT, { searchParams: sidSearchParams }),
    ]);
    this.L.trace({ headers: sidResps.map((r) => r.headers) }, 'Set SID responses headers');
    // const csrfToken = await this.getCsrf();
    await this.getStoreToken();
    return true;
  }

  async fullLogin(
    email = config.accounts[0].email,
    password = config.accounts[0].password,
    totp = config.accounts[0].totp
  ): Promise<void> {
    if (await this.refreshAndSid(false)) {
      this.L.info('Successfully refreshed login');
    } else {
      this.L.debug('Could not refresh credentials. Logging in fresh.');
      const puppetLogin = new PuppetLogin(email, password, totp);
      await puppetLogin.login();
      // await this.refreshAndSid(true);
      this.L.info('Successfully logged in fresh');
    }
  }
}
