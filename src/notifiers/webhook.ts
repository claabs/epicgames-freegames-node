import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { webhookConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class WebhookNotifier extends NotifierService {
  private config: z.infer<typeof webhookConfigSchema>;

  constructor(config: z.infer<typeof webhookConfigSchema>) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending webhook notification');

    try {
      await axios.post(
        this.config.url,
        {
          account,
          reason,
          url,
        },
        {
          responseType: 'json',
          headers: this.config.headers,
        },
      );
    } catch (err) {
      L.error(err);
      L.error(
        { webhookConfig: this.config },
        'Error sending webhook message. Please check your configuration',
      );
      throw err;
    }
  }
}
