import axios from 'axios';
import logger from '../common/logger.js';
import { NotifierService } from './notifier-service.js';
import { NotificationReason } from '../interfaces/notification-reason.js';
import { WebhookConfig } from '../common/config/index.js';

export class WebhookNotifier extends NotifierService {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending webhook notification');

    try {
      await axios.post(
        this.config.url,
        {
          account,
          reason,
          url,
        },
        {
          responseType: 'json',
          headers: this.config.headers,
        },
      );
    } catch (err) {
      L.error(err);
      L.error(
        { webhookConfig: this.config },
        'Error sending webhook message. Please check your configuration',
      );
      throw err;
    }
  }
}
