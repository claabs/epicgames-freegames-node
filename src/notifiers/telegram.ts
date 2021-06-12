import got from 'got';
import logger from '../common/logger';
import config from '../config';
import NotifierService from '../models/NotifierService';
import { NotificationType } from '../models/NotificationsType';
import { TelegramConfig } from '../models/NotificationsConfig';
import NotificationReason from '../models/NotificationReason';

class TelegramNotifier implements NotifierService {
  private readonly isActive: boolean = false;

  private readonly telegramConfig!: TelegramConfig;

  constructor() {
    const telegramConfig = config.notificationConfig.getConfig(NotificationType.TELEGRAM);
    if (!telegramConfig) {
      return;
    }
    this.isActive = true;

    this.telegramConfig = telegramConfig;
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    if (!this.isActive) {
      throw new Error(`Tried to call sendNotification of inactive notifier`);
    }

    const L = logger.child({ user: account, reason });
    L.trace('Sending telegram notification');

    /* eslint-disable @typescript-eslint/camelcase */
    await Promise.all(
      this.telegramConfig.chatIds.map(chatId => {
        const encodedUrl = encodeURI(url);
        const jsonPayload = {
          chat_id: chatId,
          text: `*Epicgames-freegames-node*,\nreason: ${reason},\naccount: ${account}, \nurl: [Click me!](${encodedUrl})`,
          disable_web_page_preview: true,
          parse_mode: 'Markdown',
        };

        L.trace({ jsonPayload }, 'Sending json payload');

        return got.post(`https://api.telegram.org/bot${this.telegramConfig.token}/sendMessage`, {
          json: jsonPayload,
          responseType: 'json',
        });
      })
    ).catch(err => {
      L.error({ telegram: this.telegramConfig }, `Failed to send message`, err);
      throw err;
    });
    /* eslint-enable @typescript-eslint/camelcase */
  }
}

const telegramNotifier = new TelegramNotifier();

export default telegramNotifier;
