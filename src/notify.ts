import { DiscordNotifier, EmailNotifier, LocalNotifier, TelegramNotifier } from './notifiers';
import {
  config,
  DiscordConfig,
  EmailConfig,
  LocalConfig,
  NotificationType,
  TelegramConfig,
} from './common/config';
import L from './common/logger';
import { NotificationReason } from './interfaces/notification-reason';

const notificationTypesArray = Object.values(NotificationType);

export function isNotificationType(
  notificationTypeString?: string
): notificationTypeString is NotificationType {
  if (!notificationTypeString) {
    return false;
  }
  return notificationTypesArray.includes(notificationTypeString as NotificationType);
}

export function toSafeNotificationType(notificationType?: string): NotificationType {
  if (isNotificationType(notificationType)) {
    return notificationType;
  }
  throw new Error(`Cannot cast string "${notificationType}" to a NotificationType`);
}

export async function sendNotification(
  url: string,
  accountEmail: string,
  reason: NotificationReason
): Promise<void> {
  const account = config.accounts.find((acct) => acct.email === accountEmail);
  const notifierConfigs = account?.notifiers || config.notifiers;
  if (!notifierConfigs || !notifierConfigs.length) {
    L.warn(
      {
        url,
        accountEmail,
        reason,
      },
      `No notifiers configured globally, or for the account. This log is all you'll get`
    );
    return;
  }
  const notifiers = notifierConfigs.map((notifierConfig) => {
    switch (notifierConfig.type) {
      case NotificationType.DISCORD:
        return new DiscordNotifier(notifierConfig as DiscordConfig);
      case NotificationType.EMAIL:
        return new EmailNotifier(notifierConfig as EmailConfig);
      case NotificationType.LOCAL:
        return new LocalNotifier(notifierConfig as LocalConfig);
      case NotificationType.TELEGRAM:
        return new TelegramNotifier(notifierConfig as TelegramConfig);
      default:
        throw new Error(`Unexpected notifier config: ${notifierConfig.type}`);
    }
  });

  await Promise.all(
    notifiers.map((notifier) => notifier.sendNotification(url, accountEmail, reason))
  );
}
