import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { slackConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class SlackNotifier extends NotifierService {
  private config: z.infer<typeof slackConfigSchema>;

  constructor(config: z.infer<typeof slackConfigSchema>) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Slack notification');

    try {
      await axios.post(
        this.config.webhookUrl,
        {
          text: `epicgames-freegames-node needs an action performed. \nReason: ${reason} \nAccount: ${account} \nURL: ${url}`,
        },
        {
          responseType: 'text',
        },
      );
    } catch (error) {
      L.error(error);
      L.error(
        { SlackConfig: this.config },
        'Error sending Slack message. Please check your configuration',
      );
      throw error;
    }
  }
}
