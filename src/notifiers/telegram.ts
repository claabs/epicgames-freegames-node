import got from 'got';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { TelegramConfig } from '../common/config';
import { NotificationReason } from '../interfaces/notification-reason';

export class TelegramNotifier extends NotifierService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    super();

    this.config = config;
  }

  /**
   * @ignore
   */
  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending telegram notification');

    const encodedUrl = encodeURI(url);
    const jsonPayload = {
      chat_id: this.config.chatId,
      text: `*epicgames-freegames-node*,\nreason: ${reason},\naccount: ${account}, \nurl: [Click me!](${encodedUrl})`,
      disable_web_page_preview: true,
      parse_mode: 'MarkdownV2',
    };

    L.trace({ jsonPayload }, 'Sending json payload');

    try {
      await got.post(`https://api.telegram.org/bot${this.config.token}/sendMessage`, {
        json: jsonPayload,
        responseType: 'json',
      });
    } catch (err) {
      L.error(err);
      L.error({ chatId: this.config.chatId }, `Failed to send message`);
      throw err;
    }
  }
}
