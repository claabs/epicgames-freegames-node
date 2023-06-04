import open from 'open';
import { LocalConfig } from '../common/config';
import { NotifierService } from './notifier-service';
import { NotificationReason } from '../interfaces/notification-reason';

export class LocalNotifier extends NotifierService {
  private config: LocalConfig;

  constructor(config: LocalConfig) {
    super();
    this.config = config;
  }

  // eslint-disable-next-line class-methods-use-this
  async sendNotification(
    _account: string,
    _reason: NotificationReason,
    url?: string
  ): Promise<void> {
    if (url) {
      await open(url);
    }
  }
}
