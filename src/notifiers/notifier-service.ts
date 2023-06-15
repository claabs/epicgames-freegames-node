import { NotificationReason } from '../interfaces/notification-reason';

export abstract class NotifierService {
  abstract sendNotification(
    account: string,
    reason: NotificationReason,
    url?: string
  ): Promise<void>;
}
