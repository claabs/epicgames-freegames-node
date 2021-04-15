export default interface NotifierService {
  sendNotification(url: string, account: string): Promise<void>;
}
