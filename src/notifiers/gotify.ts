import axios from 'axios';

import { NotifierService } from './notifier-service.js';
import logger from '../common/logger.js';

import type { GotifyConfig } from '../common/config/index.js';
import type { NotificationReason } from '../interfaces/notification-reason.js';

export class GotifyNotifier extends NotifierService {
  private config: GotifyConfig;

  constructor(config: GotifyConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
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
