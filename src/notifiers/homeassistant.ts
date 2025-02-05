import axios from 'axios';
import logger from '../common/logger.js';
import { NotifierService } from './notifier-service.js';
import { NotificationReason } from '../interfaces/notification-reason.js';
import { HomeassistantConfig } from '../common/config/index.js';

export class HomeassistantNotifier extends NotifierService {
  private config: HomeassistantConfig;

  constructor(config: HomeassistantConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url?: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending homeassistant notification');

    try {
      await axios.post(
        `${this.config.instance}/api/services/notify/${this.config.notifyservice}`,
        {
          title: `Action request from Epic Games`,
          message: `epicgames needs an action performed. Reason: ${reason} {{ '\n' -}} Link: ${url}`,
          data: {
            ...(url ? { url, clickAction: url } : {}),
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
