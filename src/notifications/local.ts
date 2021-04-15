import open from 'open';
import NotifierService from '../models/NotifierService';

class LocalNotifier implements NotifierService {
  // eslint-disable-next-line class-methods-use-this
  async sendNotification(url: string): Promise<void> {
    await open(url);
  }
}

const localNotifier = new LocalNotifier();

export default localNotifier;
