import open from 'open';
import NotificationService from './index';

class LocalNotifier implements NotificationService {
  // eslint-disable-next-line class-methods-use-this
  async sendNotification(url: string): Promise<void> {
    await open(url);
  }
}

const localNotifier = new LocalNotifier();

export default localNotifier;
