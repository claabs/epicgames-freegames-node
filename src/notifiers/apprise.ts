import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { AppriseConfig } from '../common/config';
import { NotificationReason } from '../interfaces/notification-reason';

export class AppriseNotifier extends NotifierService {
  private config: AppriseConfig;

  constructor(config: AppriseConfig) {
    super();

    this.config = config;
  }

  /**
   * @ignore
   */
  async sendNotification(account: string, reason: NotificationReason, url?: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Apprise notification');

    const jsonPayload = {
      urls: this.config.urls,
      title: 'epicgames-freegames-node',
      body: `epicgames-freegames-node needs an action performed.
reason: ${reason}
account: ${account}${
        url
          ? `
url: ${encodeURI(url)}`
          : ''
      }`,
      format: 'text', // The text format is ugly, but all the platforms support it.
      type: 'info',
    };

    L.trace({ apiUrl: this.config.apiUrl, jsonPayload }, 'Sending json payload');

    try {
      await axios.post(`${this.config.apiUrl}/notify`, jsonPayload, {
        responseType: 'text',
      });
    } catch (err) {
      L.error(err);
      L.error({ urls: this.config.urls }, `Failed to send message`);
      throw err;
    }
  }
}
