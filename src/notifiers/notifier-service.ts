import { NotificationFields } from '../interfaces/notification';

export abstract class NotifierService {
  abstract sendNotification(fields: NotificationFields): Promise<void>;
}
