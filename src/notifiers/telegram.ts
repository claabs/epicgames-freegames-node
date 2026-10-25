import axios from '../axios-base.ts';
import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type z from 'zod';

import type { telegramConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class TelegramNotifier extends NotifierService {
  private config: z.infer<typeof telegramConfigSchema>;

  constructor(config: z.infer<typeof telegramConfigSchema>) {
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
    const escapedMessage = message.replaceAll(
      /(\[[^\][]*]\(http[^()]*\))|[_*[\]()~>#+=|{}.!-]/gi,
      (x: string, y: string): string => y || `\\${x}`,
    );
    const jsonPayload = {
      chat_id: this.config.chatId,
      text: escapedMessage,
      disable_web_page_preview: true,
      parse_mode: 'MarkdownV2',
      ...(this.config.topic ? { message_thread_id: this.config.topic } : {}),
    };

    L.trace({ jsonPayload }, 'Sending json payload');

    try {
      await axios.post(`${this.config.apiUrl}/bot${this.config.token}/sendMessage`, jsonPayload, {
        responseType: 'json',
      });
    } catch (error) {
      L.error(error);
      L.error({ chatId: this.config.chatId }, `Failed to send message`);
      throw error;
    }
  }
}
