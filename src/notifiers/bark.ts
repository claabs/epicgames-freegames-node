import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { BarkConfig } from '../common/config';
import { NotificationReason } from '../interfaces/notification-reason';

export class BarkNotifier extends NotifierService {
  private config: BarkConfig;

  constructor(config: BarkConfig) {
    super();
    this.config = config;
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending Bark notification');

    const toUrl = encodeURIComponent(url);
    const message = encodeURIComponent(`reason: ${reason}, account: ${account}`);

    const requestUrl = `${this.config.apiUrl}/${encodeURIComponent(
      this.config.key
    )}/${encodeURIComponent(this.config.title)}/${message}?url=${toUrl}&group=${encodeURIComponent(
      this.config.group
    )}`;

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
