import TelegramBot from 'node-telegram-bot-api';
import logger from '../common/logger';
import config from '../config';
import NotifierService from '../models/NotifierService';
import { NotificationType } from '../models/NotificationsType';
import { TelegramConfig } from '../models/NotificationsConfig';

class TelegramNotifier implements NotifierService {
  private readonly isActive: boolean = false;

  private readonly telegramConfig!: TelegramConfig;

  private readonly telegramBot!: TelegramBot;

  constructor() {
    const telegramConfig = config.notificationConfig.getConfig(NotificationType.TELEGRAM);
    if (!telegramConfig) {
      return;
    }
    this.isActive = true;

    this.telegramConfig = telegramConfig;
    this.telegramBot = new TelegramBot(this.telegramConfig.token);
  }

  async sendNotification(url: string, account: string): Promise<void> {
    if (!this.isActive) {
      throw new Error(`Tried to call sendNotification of inactive notifier`);
    }

    const L = logger.child({ user: account });
    L.trace('Sending telegram notification');

    await Promise.all(
      this.telegramConfig.chatIds.map(chatId => {
        return this.telegramBot.sendMessage(
          chatId,
          `<b>epicgames-freegames-node</b> captcha: ${url}`,
          // eslint-disable-next-line @typescript-eslint/camelcase
          { parse_mode: 'HTML' }
        );
      })
    ).catch(err => {
      L.error({ telegram: this.telegramConfig }, `Failed to send message`, err);
      throw err;
    });
  }
}

const telegramNotifier = new TelegramNotifier();

export default telegramNotifier;
