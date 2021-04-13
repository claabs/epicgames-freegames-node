export default interface NotificationService {
  sendNotification(url: string, account: string): Promise<void>;
}
