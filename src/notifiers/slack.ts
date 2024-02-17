import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationFields } from '../interfaces/notification';
import { SlackConfig } from '../common/config';

export class SlackNotifier extends NotifierService {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    super();
    this.config = config;
  }

  async sendNotification(fields: NotificationFields): Promise<void> {
    const { account, reason, url } = fields;
    const L = logger.child({ user: account, reason });
    L.trace('Sending Slack notification');

    try {
      await axios.post(
        this.config.webhookUrl,
        {
          text: `epicgames-freegames-node needs an action performed. \nReason: ${reason} \nAccount: ${account} \nURL: ${url}`,
        },
        {
          responseType: 'text',
        }
      );
    } catch (err) {
      L.error(err);
      L.error(
        { SlackConfig: this.config },
        'Error sending Slack message. Please check your configuration'
      );
      throw err;
    }
  }
}
