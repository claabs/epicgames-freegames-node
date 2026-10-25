import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { appriseConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class AppriseNotifier extends NotifierService {
  private config: z.infer<typeof appriseConfigSchema>;

  constructor(config: z.infer<typeof appriseConfigSchema>) {
    super();

    this.config = config;
  }

  /**
   * @ignore
   */
  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Apprise notification');

    const jsonPayload = {
      urls: this.config.urls,
      title: 'epicgames-freegames-node',
      body: `epicgames-freegames-node needs an action performed.
reason: ${reason}
account: ${account}
url: ${url}`,
      format: 'text', // The text format is ugly, but all the platforms support it.
      type: 'info',
    };

    L.trace({ apiUrl: this.config.apiUrl, jsonPayload }, 'Sending json payload');

    try {
      await axios.post(`${this.config.apiUrl}/notify`, jsonPayload, {
        responseType: 'text',
      });
    } catch (error) {
      L.error(error);
      L.error({ urls: this.config.urls }, `Failed to send message`);
      throw error;
    }
  }
}
