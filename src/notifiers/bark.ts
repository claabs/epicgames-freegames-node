import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { barkConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class BarkNotifier extends NotifierService {
  private config: z.infer<typeof barkConfigSchema>;

  constructor(config: z.infer<typeof barkConfigSchema>) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Bark notification');

    const message = encodeURIComponent(`reason: ${reason}, account: ${account}`);

    const requestUrl = `${this.config.apiUrl}/${encodeURIComponent(
      this.config.key,
    )}/${encodeURIComponent(this.config.title)}/${message}?url=${encodeURIComponent(url)}&group=${encodeURIComponent(this.config.group)}`;

    L.trace({ requestUrl }, 'Sending request');
    try {
      await axios.get(requestUrl);
    } catch (err) {
      L.error(err);
      L.error(this.config, `Failed to send message`);
      throw err;
    }
  }
}
