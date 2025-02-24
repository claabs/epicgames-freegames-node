import axios from 'axios';
import logger from '../common/logger.js';
import { NotifierService } from './notifier-service.js';
import { NotificationReason } from '../interfaces/notification-reason.js';
import { DiscordConfig } from '../common/config/index.js';

// https://birdie0.github.io/discord-webhooks-guide/index.html
export class DiscordNotifier extends NotifierService {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    super();
    this.config = config;
  }

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
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
      await axios.post(
        this.config.webhookUrl,
        {
          content: `${mentions}epicgames-freegames-node needs an action performed. ${this.config.showUrl ? `\n${url}` : ''}`,
          embeds: [
            {
              fields: [
                {
                  name: 'Account',
                  value: account || 'unknown', // Fallback required to avoid 400 on empty value
                },
                {
                  name: 'Reason',
                  value: reason.toLowerCase() || 'unknown', // Fallback required to avoid 400 on empty value
                },
              ],
              title: 'Click to proceed',
              url,
            },
          ],
        },
        {
          responseType: 'json',
        },
      );
    } catch (err) {
      L.error(err);
      L.error({ webhookUrl: this.config.webhookUrl }, `Failed to send message`);
      throw err;
    }
  }
}
