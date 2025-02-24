import axios from 'axios';
import logger from '../common/logger.js';
import { NotifierService } from './notifier-service.js';
import { BarkConfig } from '../common/config/index.js';
import { NotificationReason } from '../interfaces/notification-reason.js';

export class BarkNotifier extends NotifierService {
  private config: BarkConfig;

  constructor(config: BarkConfig) {
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
