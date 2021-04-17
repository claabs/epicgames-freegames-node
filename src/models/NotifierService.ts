import NotificationReason from './NotificationReason';

export default interface NotifierService {
  sendNotification(url: string, account: string, reason: NotificationReason): Promise<void>;
}
