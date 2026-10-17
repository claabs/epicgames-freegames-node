import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { homeAssistantConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class HomeAssistantNotifier extends NotifierService {
  private config: z.infer<typeof homeAssistantConfigSchema>;

  constructor(config: z.infer<typeof homeAssistantConfigSchema>) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending homeassistant notification');

    try {
      await axios.post(
        `${this.config.instance}/api/services/notify/${this.config.notifyservice}`,
        {
          title: `Action request from Epic Games`,
          message: `epicgames needs an action performed. Reason: ${reason} {{ '\n' -}} Link: ${url}`,
          data: {
            url,
            clickAction: url,
            ...(this.config.customData ?? {}),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.token}`,
          },
          responseType: 'json',
        },
      );
    } catch (err) {
      L.error(err);
      L.error(
        { homeassistantConfig: this.config },
        'Error sending homeassistant message. Please check your configuration',
      );
      throw err;
    }
  }
}
