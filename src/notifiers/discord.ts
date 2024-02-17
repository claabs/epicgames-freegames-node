import axios from 'axios';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationFields } from '../interfaces/notification';
import { DiscordConfig } from '../common/config';

// https://birdie0.github.io/discord-webhooks-guide/index.html
export class DiscordNotifier extends NotifierService {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    super();
    this.config = config;
  }

  async sendNotification(fields: NotificationFields): Promise<void> {
    const { account, reason, url, password } = fields;
    const L = logger.child({ user: account, reason });
    L.trace('Sending discord notification');

    let mentions = '';
    if (this.config.mentionedUsers) {
      mentions = `${mentions}${this.config.mentionedUsers.map((u) => `<@${u}>`).join('')}\n`;
    }
    if (this.config.mentionedRoles) {
      mentions = `${mentions}${this.config.mentionedRoles.map((r) => `<@&${r}>`).join('')}\n`;
    }

    const embedFields = [
      {
        name: 'Account',
        value: account || 'unknown', // Fallback required to avoid 400 on empty value
      },
      {
        name: 'Reason',
        value: reason.toLowerCase() || 'unknown', // Fallback required to avoid 400 on empty value
      },
    ];

    if (password) {
      embedFields.push({
        name: 'Password',
        value: password || 'unknown', // Fallback required to avoid 400 on empty value
      });
    }
    try {
      await axios.post(
        this.config.webhookUrl,
        {
          content: `${mentions}epicgames-freegames-node needs an action performed.`,
          embeds: [
            {
              fields: embedFields,
              title: 'Click to proceed',
              url,
            },
          ],
        },
        {
          responseType: 'json',
        }
      );
    } catch (err) {
      L.error(err);
      L.error({ webhookUrl: this.config.webhookUrl }, `Failed to send message`);
      throw err;
    }
  }
}
