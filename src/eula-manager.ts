import axios from 'axios';
import { Logger } from 'pino';
import { EULA_AGREEMENTS_ENDPOINT, REQUIRED_EULAS, STORE_HOMEPAGE } from './common/constants.js';
import logger from './common/logger.js';
import { getAccountAuth } from './common/device-auths.js';
import { config } from './common/config/setup.js';
import { generateLoginRedirect } from './purchase.js';
import { sendNotification } from './notify.js';
import { NotificationReason } from './interfaces/notification-reason.js';

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
  private accountId: string;

  private accessToken: string;

  private email: string;

  private L: Logger;

  constructor(email: string) {
    this.L = logger.child({ user: email });
    const deviceAuth = getAccountAuth(email);
    if (!deviceAuth) throw new Error('Device auth not found');
    this.accountId = deviceAuth.account_id;
    this.accessToken = deviceAuth.access_token;
    this.email = email;
  }

  public async checkEulaStatus(): Promise<void> {
    const pendingEulas = await this.fetchPendingEulas();

    if (pendingEulas.length) {
      if (config.notifyEula) {
        this.L.error('User needs to log in an accept an updated EULA');
        const actionUrl = generateLoginRedirect(STORE_HOMEPAGE);
        await sendNotification(this.email, NotificationReason.PRIVACY_POLICY_ACCEPTANCE, actionUrl);
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
        const url = `${EULA_AGREEMENTS_ENDPOINT}/${key}/account/${this.accountId}`;
        this.L.trace({ url }, 'Checking EULA status');
        const response = await axios.get<EulaAgreementResponse | undefined>(url, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
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
        const url = `${EULA_AGREEMENTS_ENDPOINT}/${eulaVersion.key}/version/${eulaVersion.version}/account/${this.accountId}/accept`;
        this.L.trace({ url }, 'Accepting EULA');
        await axios.post(url, undefined, {
          params: { locale: eulaVersion.locale },
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        this.L.debug({ key: eulaVersion.key }, 'EULA accepted');
      }),
    );
  }
}
