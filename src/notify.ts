import {
  AppriseNotifier,
  DiscordNotifier,
  EmailNotifier,
  LocalNotifier,
  TelegramNotifier,
  GotifyNotifier,
  SlackNotifier,
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
  HomeassistantConfig,
} from './common/config';
import L from './common/logger';
import { NotificationReason } from './interfaces/notification-reason';
import { getDevtoolsUrl, safeLaunchBrowser, safeNewPage } from './common/puppeteer';
import { getLocaltunnelUrl } from './common/localtunnel';
import { PushoverNotifier } from './notifiers/pushover';
import { HomeassistantNotifier } from './notifiers/homeassistant';

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
      default:
        throw new Error(`Unexpected notifier config: ${notifierConfig.type}`);
    }
  });

  await Promise.all(
    notifiers.map((notifier) => notifier.sendNotification(url, accountEmail, reason))
  );
}

export async function testNotifiers(): Promise<void> {
  L.info('Testing all configured notifiers');
  const browser = await safeLaunchBrowser(L);
  const page = await safeNewPage(browser, L);
  L.trace(getDevtoolsUrl(page));
  await page.goto('https://claabs.github.io/epicgames-freegames-node/test.html');
  let url = await page.openPortal();
  if (config.webPortalConfig?.localtunnel) {
    url = await getLocaltunnelUrl(url);
  }
  const accountEmails = config.accounts.map((acct) =>
    sendNotification(url, acct.email, NotificationReason.TEST)
  );
  await Promise.all(accountEmails);
  L.info('Test notifications sent. Waiting for test page interaction...');
  try {
    await page.waitForSelector('#complete', {
      visible: true,
      timeout: config.notificationTimeoutHours * 60 * 60 * 1000,
    });
    L.info('Notification test complete');
  } catch (err) {
    L.warn('Test notification timed out. Continuing...');
  }
  await browser.close();
}
