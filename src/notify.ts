import { config, NotificationType } from './common/config/index.js';
// eslint-disable-next-line import-x/no-rename-default
import L from './common/logger.js';
// eslint-disable-next-line import-x/no-cycle
import { DeviceLogin } from './device-login.js';
import {
  AppriseNotifier,
  BarkNotifier,
  DiscordNotifier,
  EmailNotifier,
  GotifyNotifier,
  HomeassistantNotifier,
  LocalNotifier,
  NtfyNotifier,
  PushoverNotifier,
  SlackNotifier,
  TelegramNotifier,
  WebhookNotifier,
} from './notifiers/index.js';

import type {
  AppriseConfig,
  BarkConfig,
  DiscordConfig,
  EmailConfig,
  GotifyConfig,
  HomeassistantConfig,
  NtfyConfig,
  PushoverConfig,
  SlackConfig,
  TelegramConfig,
  WebhookConfig,
} from './common/config/index.js';
import type { NotificationReason } from './interfaces/notification-reason.js';

export async function sendNotification(
  accountEmail: string,
  reason: NotificationReason,
  url: string,
): Promise<void> {
  const account = config.accounts.find((acct) => acct.email === accountEmail);
  const notifierConfigs = account?.notifiers ?? config.notifiers;
  if (!notifierConfigs?.length) {
    L.warn(
      {
        url,
        accountEmail,
        reason,
      },
      "No notifiers configured globally, or for the account. This log is all you'll get",
    );
    return;
  }
  const notifiers = notifierConfigs.map((notifierConfig) => {
    switch (notifierConfig.type) {
      case NotificationType.DISCORD:
        return new DiscordNotifier(notifierConfig as DiscordConfig);
      case NotificationType.PUSHOVER:
        return new PushoverNotifier(notifierConfig as PushoverConfig);
      case NotificationType.EMAIL:
        return new EmailNotifier(notifierConfig as EmailConfig);
      case NotificationType.LOCAL:
        return new LocalNotifier();
      case NotificationType.TELEGRAM:
        return new TelegramNotifier(notifierConfig as TelegramConfig);
      case NotificationType.APPRISE:
        return new AppriseNotifier(notifierConfig as AppriseConfig);
      case NotificationType.GOTIFY:
        return new GotifyNotifier(notifierConfig as GotifyConfig);
      case NotificationType.SLACK:
        return new SlackNotifier(notifierConfig as SlackConfig);
      case NotificationType.HOMEASSISTANT:
        return new HomeassistantNotifier(notifierConfig as HomeassistantConfig);
      case NotificationType.BARK:
        return new BarkNotifier(notifierConfig as BarkConfig);
      case NotificationType.NTFY:
        return new NtfyNotifier(notifierConfig as NtfyConfig);
      case NotificationType.WEBHOOK:
        return new WebhookNotifier(notifierConfig as WebhookConfig);
      default:
        throw new Error(`Unexpected notifier config: ${notifierConfig.type}`);
    }
  });

  await Promise.all(
    notifiers.map(async (notifier) => notifier.sendNotification(accountEmail, reason, url)),
  );
}

export async function testNotifiers(): Promise<void> {
  L.info('Testing all configured notifiers');

  try {
    await Promise.any(
      config.accounts.map(async (acct) => {
        const deviceAuth = new DeviceLogin({ user: acct.email });
        return deviceAuth.testServerNotify();
      }),
    );
    L.info('Notification test complete');
  } catch {
    L.warn('Test notification timed out. Continuing...');
  }
}
