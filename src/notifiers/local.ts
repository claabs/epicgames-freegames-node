import open from 'open';
import { NotifierService } from './notifier-service.js';
import type { NotificationReason } from '../interfaces/notification-reason.js';

export class LocalNotifier extends NotifierService {
  // eslint-disable-next-line class-methods-use-this
  async sendNotification(
    _account: string,
    _reason: NotificationReason,
    url: string,
  ): Promise<void> {
    await open(url);
  }
}
