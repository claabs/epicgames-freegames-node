import { NotificationType } from '../models/NotificationsType';
import emailNotifier from './email';
import telegramNotifier from './telegram';
import localNotifier from './local';
import config from '../config';
import NotifierService from '../models/NotifierService';

const notifiers: Record<NotificationType, NotifierService> = {
  [NotificationType.EMAIL]: emailNotifier,
  [NotificationType.TELEGRAM]: telegramNotifier,
  [NotificationType.LOCAL]: localNotifier,
};

export default function getNotifier(): NotifierService {
  return notifiers[config.notificationType];
}
