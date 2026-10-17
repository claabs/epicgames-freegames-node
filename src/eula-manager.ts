import axios from './axios-base.ts';
import { config } from './common/config/setup.ts';
import { EULA_AGREEMENTS_ENDPOINT, REQUIRED_EULAS, STORE_HOMEPAGE } from './common/constants.ts';
import logger from './common/logger.ts';
import { sendNotification } from './notify.ts';
import { generateLoginRedirect } from './purchase.ts';

import type { Logger } from 'pino';

import type { AuthTokenResponse } from './common/device-auths.ts';

export interface EulaVersion {
  key: string;
  version: number;
  locale: string;
}

export interface EulaAgreementResponse {
  key: string;
  version: number;
  revision: number;
  title: string;
  body: string;
  locale: string;
  createdTimestamp: string;
  lastModifiedTimestamp: string;
  status: string;
  description: string;
  custom: boolean;
  url: string;
  wasDeclined: boolean;
  operatorId: string;
  notes: string;
  hasResponse: boolean;
}

export class EulaManager {
  private deviceAuth: AuthTokenResponse;

  private email: string;

  private L: Logger;

  constructor(email: string, deviceAuth: AuthTokenResponse) {
    this.L = logger.child({ user: email });
    this.email = email;
    this.deviceAuth = deviceAuth;
  }

  private async getAccountId(): Promise<string> {
    return this.deviceAuth.account_id;
  }

  private async getAccessToken(): Promise<string> {
    return this.deviceAuth.access_token;
  }

  public async checkEulaStatus(): Promise<void> {
    this.L.debug('Checking EULA status');
    const pendingEulas = await this.fetchPendingEulas();

    if (pendingEulas.length) {
      if (config.notifyEula) {
        this.L.error('User needs to log in an accept an updated EULA');
        const actionUrl = generateLoginRedirect(STORE_HOMEPAGE);
        await sendNotification(this.email, 'PRIVACY_POLICY_ACCEPTANCE', actionUrl);
        throw new Error(`${this.email} needs to accept an updated EULA`);
      } else {
        this.L.info({ pendingEulas }, 'Accepting EULAs');
        await this.acceptEulas(pendingEulas);
      }
    }
  }

  private async fetchPendingEulas() {
    const eulaStatuses: (EulaVersion | undefined)[] = await Promise.all(
      REQUIRED_EULAS.map(async (key) => {
        const url = `${EULA_AGREEMENTS_ENDPOINT}/${key}/account/${await this.getAccountId()}`;
        this.L.trace({ url }, 'Checking EULA status');
        const response = await axios.get<EulaAgreementResponse | undefined>(url, {
          headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
        });
        if (!response.data) return undefined;
        this.L.debug({ key }, 'EULA is not accepted');
        return {
          key,
          version: response.data.version,
          locale: response.data.locale,
        };
      }),
    );
    const pendingEulas = eulaStatuses.filter((eula): eula is EulaVersion => eula !== undefined);
    this.L.trace({ pendingEulas }, 'Pending EULAs');
    return pendingEulas;
  }

  private async acceptEulas(eulaVersions: EulaVersion[]): Promise<void> {
    await Promise.all(
      eulaVersions.map(async (eulaVersion) => {
        const url = `${EULA_AGREEMENTS_ENDPOINT}/${eulaVersion.key}/version/${eulaVersion.version}/account/${await this.getAccountId()}/accept`;
        this.L.trace({ url }, 'Accepting EULA');
        await axios.post(url, undefined, {
          params: { locale: eulaVersion.locale },
          headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
        });
        this.L.debug({ key: eulaVersion.key }, 'EULA accepted');
      }),
    );
  }
}
