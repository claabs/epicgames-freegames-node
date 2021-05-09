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

    await Promise.all(
      this.telegramConfig.chatIds.map(chatId =>
        got.post(`https://api.telegram.org/bot${this.telegramConfig.token}/sendMessage`, {
          json: {
            // eslint-disable-next-line @typescript-eslint/camelcase
            chat_id: chatId,
            text: `**Epicgames-freegames-node**,\nreason: ${reason},\naccount: ${account}, \nurl: ${url}`,
            // eslint-disable-next-line @typescript-eslint/camelcase
            disable_web_page_preview: true,
            // eslint-disable-next-line @typescript-eslint/camelcase
            parse_mode: 'Markdown',
          },
          responseType: 'json',
        })
      )
    ).catch(err => {
      L.error({ telegram: this.telegramConfig }, `Failed to send message`, err);
      throw err;
    });
  }
}

const telegramNotifier = new TelegramNotifier();

export default telegramNotifier;
