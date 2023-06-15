import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationReason } from '../interfaces/notification-reason';
import { NtfyConfig } from '../common/config';

export class NtfyNotifier extends NotifierService {
  private config: NtfyConfig;

  constructor(config: NtfyConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url?: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Ntfy notification');

    try {
      await axios.post(
        this.config.webhookUrl,
        `epicgames-freegames-node needs an action performed. Reason: ${reason} Account: ${account}`,
        {
          headers: {
            Title: 'epicgames-freegames-node needs an action performed',
            Priority: this.config.priority,
            Tags: 'closed_lock_with_key',
            Click: url,
            Authorization: `Bearer ${this.config.token}`,
          },
          responseType: 'text',
        }
      );
    } catch (err) {
      L.error(err);
      L.error(
        { NtfyConfig: this.config },
        'Error sending Ntfy message. Please check your configuration'
      );
      throw err;
    }
  }
}
