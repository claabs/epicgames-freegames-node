import got from 'got';
import logger from '../common/logger';
import config from '../config';
import NotifierService from '../models/NotifierService';
import { NotificationType } from '../models/NotificationsType';
import { DiscordConfig } from '../models/NotificationsConfig';

// https://birdie0.github.io/discord-webhooks-guide/index.html
class DiscordNotifier implements NotifierService {
  private readonly isActive: boolean = false;

  private readonly discordConfig!: DiscordConfig;

  constructor() {
    const discordConfig = config.notificationConfig.getConfig(NotificationType.DISCORD);
    if (!discordConfig) {
      return;
    }
    this.isActive = true;

    this.discordConfig = discordConfig;
  }

  async sendNotification(url: string, account: string): Promise<void> {
    if (!this.isActive) {
      throw new Error(`Tried to call sendNotification of inactive notifier`);
    }

    const L = logger.child({ user: account });
    L.trace('Sending telegram notification');

    await got
      .post(this.discordConfig.webhookUrl, {
        json: {
          content: `**epicgames-freegames-node**, account: ${account}`,
          embeds: [
            {
              title: 'Captcha',
              url,
            },
          ],
        },
        responseType: 'json',
      })
      .catch(err => {
        L.error({ discord: this.discordConfig }, `Failed to send message`, err);
        throw err;
      });
  }
}

const discordNotifier = new DiscordNotifier();

export default discordNotifier;
