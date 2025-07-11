import axios from 'axios';

import { NotifierService } from './notifier-service.js';
import logger from '../common/logger.js';

import type { TelegramConfig } from '../common/config/index.js';
import type { NotificationReason } from '../interfaces/notification-reason.js';

export class TelegramNotifier extends NotifierService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    super();

    this.config = config;
  }

  /**
   * @ignore
   */
  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending telegram notification');

    const message = `epicgames-freegames-node\nreason: ${reason},\naccount: ${account}\nurl: [Click here](${url})`;
    // https://stackoverflow.com/a/60145565/5037239
    const escapedMessage = message.replace(
      /(\[[^\][]*]\(http[^()]*\))|[_*[\]()~>#+=|{}.!-]/gi,
      (x: string, y: string): string => y || `\\${x}`,
    );
    const jsonPayload = {
      chat_id: this.config.chatId,
      text: escapedMessage,
      disable_web_page_preview: true,
      parse_mode: 'MarkdownV2',
    };

    L.trace({ jsonPayload }, 'Sending json payload');

    try {
      await axios.post(`${this.config.apiUrl}/bot${this.config.token}/sendMessage`, jsonPayload, {
        responseType: 'json',
      });
    } catch (err) {
      L.error(err);
      L.error({ chatId: this.config.chatId }, `Failed to send message`);
      throw err;
    }
  }
}
