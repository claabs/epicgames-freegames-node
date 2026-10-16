import { config } from './common/config/index.js';
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
  HomeAssistantNotifier,
  LocalNotifier,
  NtfyNotifier,
  PushoverNotifier,
  SlackNotifier,
  TelegramNotifier,
  WebhookNotifier,
} from './notifiers/index.js';

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
      case 'discord':
        return new DiscordNotifier(notifierConfig);
      case 'pushover':
        return new PushoverNotifier(notifierConfig);
      case 'email':
        return new EmailNotifier(notifierConfig);
      case 'local':
        return new LocalNotifier();
      case 'telegram':
        return new TelegramNotifier(notifierConfig);
      case 'apprise':
        return new AppriseNotifier(notifierConfig);
      case 'gotify':
        return new GotifyNotifier(notifierConfig);
      case 'slack':
        return new SlackNotifier(notifierConfig);
      case 'homeassistant':
        return new HomeAssistantNotifier(notifierConfig);
      case 'bark':
        return new BarkNotifier(notifierConfig);
      case 'ntfy':
        return new NtfyNotifier(notifierConfig);
      case 'webhook':
        return new WebhookNotifier(notifierConfig);
      default:
        throw new Error(
          `Unexpected notifier config: ${(notifierConfig as Record<string, string>).type}`,
        );
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
