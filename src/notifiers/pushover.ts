import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationFields } from '../interfaces/notification';
import { PushoverConfig } from '../common/config';

export class PushoverNotifier extends NotifierService {
  private config: PushoverConfig;

  constructor(config: PushoverConfig) {
    super();
    this.config = config;
  }

  async sendNotification(fields: NotificationFields): Promise<void> {
    const { account, reason, url } = fields;
    const L = logger.child({ user: account, reason });
    L.trace('Sending pushover notification');

    try {
      await axios.post(
        'https://api.pushover.net/1/messages.json',
        {
          token: this.config.token,
          user: this.config.userKey,
          message: `epicgames-freegames-node needs an action performed. Reason: ${reason}`,
          url,
        },
        {
          responseType: 'json',
        }
      );
    } catch (err) {
      L.error(err);
      L.error(
        { pushoverConfig: this.config },
        'Error sending pushover message. Please check your configuration'
      );
      throw err;
    }
  }
}
