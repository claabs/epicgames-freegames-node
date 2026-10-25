import type { NotificationReason } from '../notify.ts';

export abstract class NotifierService {
  abstract sendNotification(
    account: string,
    reason: NotificationReason,
    url: string,
  ): Promise<void>;
}
