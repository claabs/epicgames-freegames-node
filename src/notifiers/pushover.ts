import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { pushoverConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class PushoverNotifier extends NotifierService {
  private config: z.infer<typeof pushoverConfigSchema>;

  constructor(config: z.infer<typeof pushoverConfigSchema>) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
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
