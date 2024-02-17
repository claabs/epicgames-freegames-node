import open from 'open';
import { LocalConfig } from '../common/config';
import { NotifierService } from './notifier-service';
import { NotificationFields } from '../interfaces/notification';

export class LocalNotifier extends NotifierService {
  private config: LocalConfig;

  constructor(config: LocalConfig) {
    super();
    this.config = config;
  }

  // eslint-disable-next-line class-methods-use-this
  async sendNotification(fields: NotificationFields): Promise<void> {
    const { url } = fields;
    if (url) {
      await open(url);
    }
  }
}
