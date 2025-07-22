import type { NotificationReason } from '../interfaces/notification-reason.js';

export abstract class NotifierService {
  abstract sendNotification(
    account: string,
    reason: NotificationReason,
    url: string,
  ): Promise<void>;
}
