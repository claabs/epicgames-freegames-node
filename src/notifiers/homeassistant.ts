import got from 'got';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationReason } from '../interfaces/notification-reason';
import { HomeassistantConfig } from '../common/config';

export class HomeassistantNotifier extends NotifierService {
  private config: HomeassistantConfig;

  constructor(config: HomeassistantConfig) {
    super();
    this.config = config;
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending homeassistant notification');

    try {
      await got.post(this.config.instance + '/api/services/notify/' + this.config.notifyservice, {
		headers:
		{
		  'Authorization':'Bearer ' + this.config.token,
		},
        json: {
          title: `Captcha request from Epic Games`,
		      message: `epicgames needs a captcha solved. Reason: ${reason} {{ '\n' -}} Open this page and solve the captcha: ${url}`,
          data: {
            url: url,
            clickAction: url,
          },
        },
        responseType: 'json',
      });
    } catch (err) {
      L.error(err);
      L.error(
        { homeassistantConfig: this.config },
        'Error sending homeassistant message. Please check your configuration'
      );
      throw err;
    }
  }
}
