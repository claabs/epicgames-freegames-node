import {
  AppriseNotifier,
  DiscordNotifier,
  EmailNotifier,
  LocalNotifier,
  TelegramNotifier,
  GotifyNotifier,
  SlackNotifier,
  BarkNotifier,
  NtfyNotifier,
  PushoverNotifier,
  HomeassistantNotifier,
} from './notifiers';
import {
  config,
  DiscordConfig,
  EmailConfig,
  LocalConfig,
  NotificationType,
  TelegramConfig,
  AppriseConfig,
  PushoverConfig,
  GotifyConfig,
  SlackConfig,
  NtfyConfig,
  HomeassistantConfig,
  BarkConfig,
} from './common/config';
import L from './common/logger';
import { NotificationFields } from './interfaces/notification';
// eslint-disable-next-line import/no-cycle
import { DeviceLogin } from './device-login';

export async function sendNotification(fields: NotificationFields): Promise<void> {
  const account = config.accounts.find((acct) => acct.email === fields.account);
  const notifierConfigs = account?.notifiers || config.notifiers;
  if (!notifierConfigs || !notifierConfigs.length) {
    L.warn(
      {
        fields,
      },
      `No notifiers configured globally, or for the account. This log is all you'll get`
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
        return new LocalNotifier(notifierConfig as LocalConfig);
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
      default:
        throw new Error(`Unexpected notifier config: ${notifierConfig.type}`);
    }
  });

  await Promise.all(notifiers.map((notifier) => notifier.sendNotification(fields)));
}

export async function testNotifiers(): Promise<void> {
  L.info('Testing all configured notifiers');

  try {
    await Promise.any(
      config.accounts.map((acct) => {
        const deviceAuth = new DeviceLogin({ user: acct.email });
        return deviceAuth.testServerNotify();
      })
    );
    L.info('Notification test complete');
  } catch (err) {
    L.warn('Test notification timed out. Continuing...');
  }
}
