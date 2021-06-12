import { NotificationType } from '../models/NotificationsType';
import emailNotifier from './email';
import telegramNotifier from './telegram';
import localNotifier from './local';
import config from '../config';
import NotifierService from '../models/NotifierService';
import discordNotifier from './discord';

const notifiers: Record<NotificationType, NotifierService> = {
  [NotificationType.EMAIL]: emailNotifier,
  [NotificationType.TELEGRAM]: telegramNotifier,
  [NotificationType.DISCORD]: discordNotifier,
  [NotificationType.LOCAL]: localNotifier,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function getNotifier(email: string): NotifierService {
  // TODO: Return notifier based on email, requires changes on how config is loaded/validated
  return notifiers[config.notificationType];
}
