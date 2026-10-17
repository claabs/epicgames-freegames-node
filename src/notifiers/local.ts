import open from 'open';

import { NotifierService } from './notifier-service.ts';

import type { NotificationReason } from '../notify.ts';

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
