import got from 'got';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationReason } from '../interfaces/notification-reason';
import { DiscordConfig } from '../common/config';

// https://birdie0.github.io/discord-webhooks-guide/index.html
export class DiscordNotifier extends NotifierService {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    super();
    this.config = config;
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    const L = logger.child({ user: account, reason });
    L.trace('Sending discord notification');

    let mentions = '';
    if (this.config.mentionedUsers) {
      mentions = `${mentions}${this.config.mentionedUsers.map((u) => `<@${u}>`).join('')}\n`;
    }
    if (this.config.mentionedRoles) {
      mentions = `${mentions}${this.config.mentionedRoles.map((r) => `<@&${r}>`).join('')}\n`;
    }
    try {
      await got.post(this.config.webhookUrl, {
        json: {
          content: `${mentions}epicgames-freegames-node needs a captcha solved.`,
          embeds: [
            {
              fields: [
                {
                  name: 'Account',
                  value: account,
                },
                {
                  name: 'Reason',
                  value: reason.toLowerCase(),
                },
              ],
              title: 'Click to view captcha',
              url,
            },
          ],
        },
        responseType: 'json',
      });
    } catch (err) {
      L.error(err);
      L.error({ webhookUrl: this.config.webhookUrl }, `Failed to send message`);
      throw err;
    }
  }
}
