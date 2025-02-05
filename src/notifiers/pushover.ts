import axios from 'axios';
import logger from '../common/logger.js';
import { NotifierService } from './notifier-service.js';
import { NotificationReason } from '../interfaces/notification-reason.js';
import { PushoverConfig } from '../common/config/index.js';

export class PushoverNotifier extends NotifierService {
  private config: PushoverConfig;

  constructor(config: PushoverConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url?: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending pushover notification');

    try {
      await axios.post(
        'https://api.pushover.net/1/messages.json',
        {
          token: this.config.token,
          user: this.config.userKey,
          message: `epicgames-freegames-node needs an action performed. Reason: ${reason}`,
          ...(url ? { url } : {}),
        },
        {
          responseType: 'json',
        },
      );
    } catch (err) {
      L.error(err);
      L.error(
        { pushoverConfig: this.config },
        'Error sending pushover message. Please check your configuration',
      );
      throw err;
    }
  }
}
