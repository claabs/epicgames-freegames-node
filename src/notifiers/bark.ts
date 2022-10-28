import got from 'got';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { BarkConfig } from '../common/config';
import { NotificationReason } from '../interfaces/notification-reason';

const DEFAULT_GROUP_TITLE = 'epicgames-freegames-node';
const DEFAULT_API_URL = 'https://api.day.app';

/**
 * Bark support
 * https://github.com/Finb/Bark
 */
export class BarkNotifier extends NotifierService {
  private config: BarkConfig;

  constructor(config: BarkConfig) {
    super();

    this.config = {
      key: encodeURIComponent(config.key),
      group: encodeURIComponent(config.group ? config.group : DEFAULT_GROUP_TITLE),
      title: encodeURIComponent(config.title ? config.title : DEFAULT_GROUP_TITLE),
      apiUrl: config.apiUrl ? config.apiUrl : DEFAULT_API_URL,
    } as BarkConfig;
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending bark notification');

    const toUrl = encodeURIComponent(url);
    const message = encodeURIComponent(`reason: ${reason}, account: ${account}`);

    const requestUrl = `${this.config.apiUrl}/${this.config.key}/${this.config.title}/${message}?url=${toUrl}&group=${this.config.group}`;

    L.trace({ requestUrl }, 'Sending request');
    try {
      await got.get(requestUrl);
    } catch (err) {
      L.error(err);
      L.error(this.config, `Failed to send message`);
      throw err;
    }
  }
}
