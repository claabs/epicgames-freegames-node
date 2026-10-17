import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { ntfyConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class NtfyNotifier extends NotifierService {
  private config: z.infer<typeof ntfyConfigSchema>;

  constructor(config: z.infer<typeof ntfyConfigSchema>) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Ntfy notification');

    try {
      await axios.post(
        this.config.webhookUrl,
        `epicgames-freegames-node needs an action performed. Reason: ${reason} Account: ${account}`,
        {
          headers: {
            Title: 'epicgames-freegames-node needs an action performed',
            Priority: this.config.priority,
            Tags: 'closed_lock_with_key',
            Click: url,
            Authorization: `Bearer ${this.config.token}`,
          },
          responseType: 'text',
        },
      );
    } catch (err) {
      L.error(err);
      L.error(
        { NtfyConfig: this.config },
        'Error sending Ntfy message. Please check your configuration',
      );
      throw err;
    }
  }
}
