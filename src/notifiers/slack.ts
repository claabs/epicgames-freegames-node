import got from 'got';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationReason } from '../interfaces/notification-reason';
import { SlackConfig } from '../common/config';

export class SlackNotifier extends NotifierService {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    super();
    this.config = config;
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Slack notification');

    try {
      await got.post(this.config.webhookUrl, {
        json: {
          text: `epicgames-freegames-node needs a captcha solved. \nReason: ${reason} \nAccount: ${account} \nURL: ${url}`
        },
        responseType: 'text',
      });
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
