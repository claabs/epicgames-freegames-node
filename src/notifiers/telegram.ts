import TelegramBot from 'node-telegram-bot-api';
import logger from '../common/logger';
import config from '../config';
import NotifierService from '../models/NotifierService';

class TelegramNotifier implements NotifierService {
  telegramBot: TelegramBot;

  constructor() {
    this.telegramBot = new TelegramBot(config.telegram.token);
  }

  async sendNotification(url: string, account: string): Promise<void> {
    const L = logger.child({ user: account });
    L.trace('Sending telegram notification');

    await Promise.all(
      config.telegram.chatIds.map(chatId => {
        return this.telegramBot.sendMessage(
          chatId,
          `<b>epicgames-freegames-node</b> captcha: ${url}`,
          // eslint-disable-next-line @typescript-eslint/camelcase
          { parse_mode: 'HTML' }
        );
      })
    ).catch(err => {
      L.error({ telegram: config.telegram }, `Failed to send message`, err);
      throw err;
    });
  }
}

const telegramNotifier = new TelegramNotifier();

export default telegramNotifier;
