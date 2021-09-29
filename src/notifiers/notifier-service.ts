import { NotificationReason } from '../interfaces/notification-reason';

export abstract class NotifierService {
  abstract sendNotification(
    url: string,
    account: string,
    reason: NotificationReason
  ): Promise<void>;
}
