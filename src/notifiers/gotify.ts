import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { GotifyConfig } from '../common/config/classes';
import { NotificationReason } from '../interfaces/notification-reason';

export class GotifyNotifier extends NotifierService {
  private config: GotifyConfig;

  constructor(config: GotifyConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url?: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Gotify notification');
    const jsonPayload = {
      title: `Epic Games free games needs a Captcha solved`,
      /**
       * ATTENTION: these are markdown, to make it breaking lines correctly, there is two spaces at the end of line and before the retrun
       */
      message: `* Reason: ${reason}  
* Account: ${account}  
* URL: [${url}](${url})`,
      priority: this.config.priority,
      extras: {
        'client::display': {
          contentType: 'text/markdown',
        },
        'client::notification': {
          click: {
            url,
          },
        },
      },
    };

    try {
      await axios.post(`${this.config.apiUrl}/message?token=${this.config.token}`, jsonPayload, {
        responseType: 'json',
      });
    } catch (err) {
      L.error(err);
      L.error(this.config, `Failed to send message`);
      throw err;
    }
  }
}
