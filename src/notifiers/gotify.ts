import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { GotifyConfig } from '../common/config/classes';
import { NotificationFields } from '../interfaces/notification';

export class GotifyNotifier extends NotifierService {
  private config: GotifyConfig;

  constructor(config: GotifyConfig) {
    super();
    this.config = config;
  }

  async sendNotification(fields: NotificationFields): Promise<void> {
    const { account, reason, url } = fields;
    const L = logger.child({ user: account, reason });
    L.trace('Sending Gotify notification');
    const jsonPayload = {
      title: `Epic Games free games needs an action performed`,
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
