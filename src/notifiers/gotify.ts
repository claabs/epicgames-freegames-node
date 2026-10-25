import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { gotifyConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class GotifyNotifier extends NotifierService {
  private config: z.infer<typeof gotifyConfigSchema>;

  constructor(config: z.infer<typeof gotifyConfigSchema>) {
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
    } catch (error) {
      L.error(error);
      L.error(this.config, `Failed to send message`);
      throw error;
    }
  }
}
