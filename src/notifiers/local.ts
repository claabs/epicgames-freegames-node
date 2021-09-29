import open from 'open';
import { LocalConfig } from '../common/config';
import { NotifierService } from './notifier-service';

export class LocalNotifier extends NotifierService {
  private config: LocalConfig;

  constructor(config: LocalConfig) {
    super();
    this.config = config;
  }

  // eslint-disable-next-line class-methods-use-this
  async sendNotification(url: string): Promise<void> {
    await open(url);
  }
}
