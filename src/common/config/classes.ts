/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-useless-constructor, max-classes-per-file, @typescript-eslint/prefer-nullish-coalescing */

import path from 'node:path';

import { Expose, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import cronParser from 'cron-parser';
import 'reflect-metadata';

import type { ServerOptions } from 'node:https';
import type { ListenOptions } from 'node:net';

import type { ClassConstructor } from 'class-transformer';

export const CONFIG_DIR = process.env.CONFIG_DIR || 'config';

export enum NotificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  PUSHOVER = 'pushover',
  APPRISE = 'apprise',
  LOCAL = 'local',
  GOTIFY = 'gotify',
  SLACK = 'slack',
  HOMEASSISTANT = 'homeassistant',
  BARK = 'bark',
  NTFY = 'ntfy',
  WEBHOOK = 'webhook',
}

/**
 * @ignore
 */
export abstract class NotifierConfig {
  @IsEnum(NotificationType)
  type: NotificationType;

  constructor(type: NotificationType) {
    this.type = type;
  }
}

/**
 * For local development only. This just opens the notified URL in your default browser.
 */
export class LocalConfig extends NotifierConfig {
  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.LOCAL);
  }
}

/**
 * Sends a notification to many services via [Apprise API](https://github.com/caronc/apprise-api).
 * Supports 70+ different [notification services](https://github.com/caronc/apprise/wiki#notification-services).
 */
export class AppriseConfig extends NotifierConfig {
  /**
   * The base URL of your Apprise instance
   * @example http://localhost:8000
   * @env APPRISE_API
   */
  @IsUrl({
    require_tld: false,
  })
  apiUrl: string;

  /**
   * One or more URLs identifying where the notification should be sent to.
   * If this field isn't specified then it automatically assumes the settings.APPRISE_STATELESS_URLS in your Apprise instance.
   * More details: https://github.com/caronc/apprise-api#stateless-solution
   * @example mailto://user:pass@gmail.com
   * @env APPRISE_URLS
   */
  @IsString()
  @IsOptional()
  urls?: string;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.APPRISE);
  }
}

/**
 * Sends a message to a server text channel using a webhook
 */
export class DiscordConfig extends NotifierConfig {
  /**
   * Discord channel webhook URL.
   * Guide: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks
   * @example https://discord.com/api/webhooks/123456789123456789/A-abcdefghijklmn-abcdefghijklmnopqrst12345678-abcdefghijklmnop123456
   * @env DISCORD_WEBHOOK
   */
  @IsUrl()
  webhookUrl: string;

  /**
   * A list of Discord user IDs to ping when posting the message. The IDs must be strings wrapped in quotes.
   * How to get a user ID: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
   * @example ["914360712086843432", "914360712086843433"]
   * @env DISCORD_MENTIONED_USERS (comma separated)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedUsers: string[];

  /**
   * A list of Discord role IDs to ping when posting the message. The IDs must be strings wrapped in quotes.
   * To get a role ID: enable developer mode > right click a role > "Copy ID"
   * @example ["734548250895319070", "734548250895319071"]
   * @env DISCORD_MENTIONED_ROLES (comma separated)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedRoles: string[];

  /**
   * If true, the Discord message will contain the full URL in the message text. Helpful if you need to copy-paste the URL.
   * @example true
   * @default false
   * @env DISCORD_SHOW_URL
   */
  @IsBoolean()
  @IsOptional()
  showUrl = false;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.DISCORD);
  }
}

/**
 * Sends a pushover message
 */
export class PushoverConfig extends NotifierConfig {
  /**
   * Guide: https://pushover.net/apps/build
   * @example a172fyyl9gw99p2xi16tq8hnib48p2
   * @env PUSHOVER_TOKEN
   */
  @IsString()
  token: string;

  /**
   * @example uvgidym7l5ggpwu2r8i1oy6diaapll
   * @env PUSHOVER_USER_ID
   */
  @IsString()
  userKey: string;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.PUSHOVER);
  }
}

/**
 * Sends a message to a group chat using a bot you must set up yourself
 */
export class TelegramConfig extends NotifierConfig {
  /**
   * Telegram bot token obtained here: https://core.telegram.org/bots#3-how-do-i-create-a-bot
   * @example 644739147:AAGMPo-Jz3mKRnHRTnrPEDi7jUF1vqNOD5k
   * @env TELEGRAM_TOKEN
   */
  @IsString()
  @Matches(/\d+:[a-zA-Z0-9_-]{35}/)
  token: string;

  /**
   * Unique identifier for the target chat or username of the target channel
   * @example -987654321
   * @example @channelusername
   * @env TELEGRAM_CHAT_ID
   */
  @IsString()
  @IsNotEmpty()
  chatId: string;

  /**
   * Identifier for the topic/thread to send the messages
   * @example 5
   * @env TELEGRAM_TOPIC
   */
  @IsInt()
  @IsOptional()
  topic?: number;

  /**
   * Custom TELEGRAM server URL
   * @default https://api.telegram.org
   * @env TELEGRAM_API_URL
   */
  @IsUrl({ require_tld: false })
  @IsOptional()
  apiUrl = 'https://api.telegram.org';

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.TELEGRAM);
  }
}

/**
 * Sends a message to a self-hosted [Gotify](https://gotify.net/) server
 */
export class GotifyConfig extends NotifierConfig {
  /**
   * The Gotify server host URL
   * @example http://gotify.net
   * @env GOTIFY_API_URL
   */
  @IsUrl({
    require_tld: false,
  })
  apiUrl: string;

  /**
   * On the Gotify web UI, Apps > Create Application > reveal the token
   * @example SnL-wAvmfo_QT
   * @env GOTIFY_TOKEN
   */
  @IsNotEmpty()
  @IsString()
  token: string;

  /**
   * The priority level sent with the message.
   * @example 7
   * @default 5
   * @env GOTIFY_PRIORITY
   */
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  priority = 5;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.GOTIFY);
  }
}

/**
 * Sends a [slack](https://slack.com/) message using webhook
 */
export class SlackConfig extends NotifierConfig {
  /**
   * slack channel webhook URL.
   * Guide: https://api.slack.com/messaging/webhooks
   * @example https://hooks.slack.com/services/T22CE80ABCD/CE3AWABCDEFG/F8jdewBb4fmDDx6fV0abcdefg
   * @env SLACK_WEBHOOK
   */
  @IsUrl()
  webhookUrl: string;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.SLACK);
  }
}
/**
 * Sends a ntfy message using webhook
 */
export class NtfyConfig extends NotifierConfig {
  /**
   * ntfy channel webhook URL.
   * Guide: https://docs.ntfy.sh/publish/
   * @example https://ntfy.sh/mytopic
   * @env NTFY_WEBHOOK
   */
  @IsUrl()
  webhookUrl: string;

  /**
   * ntfy channel priority.
   * Guide: https://docs.ntfy.sh/publish/
   * @example urgent
   * @env NTFY_PRIORITY
   */
  @IsString()
  priority: string;

  /**
   * ntfy channel token.
   * Guide: https://docs.ntfy.sh/config/#access-tokens
   * @example tk_yourtoken
   * @env NTFY_TOKEN
   */
  @IsString()
  token: string;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.NTFY);
  }
}

export class EmailAuthConfig {
  /**
   * The SMTP username (if necessary)
   * @example hello@gmail.com
   * @env SMTP_USERNAME
   */
  @IsString()
  user: string;

  /**
   * The SMTP password (if necessary)
   * @example abc123
   * @env SMTP_PASSWORD
   */
  @IsString()
  pass: string;

  /**
   * @ignore
   */
  constructor() {}
}

/**
 * Configuration for sending notifications via email.
 *
 * [Example Gmail settings](https://www.siteground.com/kb/google_free_smtp_server).
 *
 * If you have 2FA setup for your Google account, you'll need to create an [app password](https://support.google.com/mail/answer/185833)
 */
export class EmailConfig extends NotifierConfig {
  /**
   * The outgoing SMTP host name
   * @example smtp.gmail.com
   * @env SMTP_HOST
   */
  @IsUrl({ require_tld: false })
  smtpHost: string;

  /**
   * The outgoing SMTP port (SSL or TLS, see secure)
   * @example 587
   * @env SMTP_PORT
   */
  @IsInt()
  @Min(0)
  @Max(65535)
  smtpPort: number;

  /**
   * The sender of the email you will recieve (can be your email address)
   * @example hello@gmail.com
   * @env EMAIL_SENDER_ADDRESS
   */
  @IsEmail()
  emailSenderAddress: string;

  /**
   * The name of the email sender
   * @example Epic Games Free Games
   * @env EMAIL_SENDER_NAME
   */
  @IsString()
  emailSenderName: string;

  /**
   * The recipient of the email (can be your email address)
   * @example hello@gmail.com
   * @env EMAIL_RECIPIENT_ADDRESS
   */
  @IsEmail()
  emailRecipientAddress: string;

  /**
   * true for SSL (port 465), false for TLS or unsecure
   * @example true
   * @default false
   * @env SMTP_SECURE
   */
  @IsBoolean()
  secure = false;

  /**
   * Auth settings for SMTP
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailAuthConfig)
  auth?: EmailAuthConfig;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.EMAIL);
  }
}

/**
 * Sends a homeassistant notification
 */
export class HomeassistantConfig extends NotifierConfig {
  /**
   * @example https://homeassistant.example.com
   * @env HOMEASSISTANT_INSTANCE
   */
  @IsString()
  instance: string;

  /**
   * @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
   * @env HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN
   */
  @IsString()
  token: string;

  /**
   * @example mobile_app_smartphone_name
   * @env HOMEASSISTANT_NOTIFYSERVICE
   */
  @IsString()
  notifyservice: string;

  /**
   * A key-value pair object to additionally pass into the service's `data` object
   * @example { "parse_mode": "html" }
   * @env HOMEASSISTANT_CUSTOM_DATA (stringified JSON)
   */
  @IsObject()
  @IsOptional()
  customData: Record<string, boolean | number | string> | undefined;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.HOMEASSISTANT);
  }
}

/**
 * Send a notification to the Bark iOS app
 * https://github.com/Finb/Bark
 */
export class BarkConfig extends NotifierConfig {
  /**
   * Bark key
   * @env BARK_KEY
   */
  @IsString()
  key: string;

  /**
   * Bark title
   * @default epicgames-freegames-node
   * @env BARK_TITLE
   */
  @IsString()
  @IsOptional()
  title = 'epicgames-freegames-node';

  /**
   * Bark group
   * @default epicgames-freegames-node
   * @env BARK_GROUP
   */
  @IsString()
  @IsOptional()
  group = 'epicgames-freegames-node';

  /**
   * Custom Bark server URL
   * @default https://api.day.app
   * @env BARK_API_URL
   */
  @IsUrl({ require_tld: false })
  @IsOptional()
  apiUrl = 'https://api.day.app';

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.BARK);
  }
}

/**
 * Sends a POST request with the notification contents in the body to a [webhook](https://en.wikipedia.org/wiki/Webhook) URL
 */
export class WebhookConfig extends NotifierConfig {
  /**
   * Webhook URL
   * @env WEBHOOK_URL
   */
  @IsUrl({ require_tld: false })
  url: string;

  /**
   * A key-value pair object to pass into the POST request headers
   * @example { Authorization: "Bearer ABCD" }
   * @env WEBHOOK_HEADERS (stringified JSON)
   */
  @IsObject()
  @IsOptional()
  headers: Record<string, string> | undefined;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.WEBHOOK);
  }
}

export type AnyNotifierConfig =
  | EmailConfig
  | DiscordConfig
  | LocalConfig
  | TelegramConfig
  | AppriseConfig
  | PushoverConfig
  | GotifyConfig
  | SlackConfig
  | HomeassistantConfig
  | BarkConfig
  | NtfyConfig
  | WebhookConfig;

const notifierSubtypes: {
  value: ClassConstructor<NotifierConfig>;
  name: string;
}[] = [
  { value: EmailConfig, name: NotificationType.EMAIL },
  { value: DiscordConfig, name: NotificationType.DISCORD },
  { value: PushoverConfig, name: NotificationType.PUSHOVER },
  { value: LocalConfig, name: NotificationType.LOCAL },
  { value: TelegramConfig, name: NotificationType.TELEGRAM },
  { value: AppriseConfig, name: NotificationType.APPRISE },
  { value: GotifyConfig, name: NotificationType.GOTIFY },
  { value: SlackConfig, name: NotificationType.SLACK },
  { value: HomeassistantConfig, name: NotificationType.HOMEASSISTANT },
  { value: BarkConfig, name: NotificationType.BARK },
  { value: NtfyConfig, name: NotificationType.NTFY },
  { value: WebhookConfig, name: NotificationType.WEBHOOK },
];

export class WebPortalConfig {
  /**
   * The URL base that will be returned when a device token login is required
   * @example https://epic.example.com
   * @default http://localhost:3000
   * @env BASE_URL
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  baseUrl?: string;

  /**
   * Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback
   * @default { port: 3000 }
   * @env SERVER_PORT (for `{port: SERVER_PORT}` only)
   */
  @IsOptional()
  @IsObject()
  listenOpts?: ListenOptions;

  /**
   * Node HTTPS.createServer options: https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
   */
  @IsOptional()
  @IsObject()
  serverOpts?: ServerOptions;

  /**
   * If true, provide a remotely accessible web address via [localtunnel](https://localtunnel.me) without the need to port forward or reverse proxy
   * @example true
   * @default false
   * @env LOCAL_TUNNEL
   */
  @IsOptional()
  @IsBoolean()
  localtunnel? = process.env.LOCAL_TUNNEL?.toLowerCase() === 'true' || false;

  export enum VmType {
    GCP = 'gcp',
  }

  @IsOptional()
  @IsEnum(VmType)
  vm?: VmType;


  /**
   * @ignore
   */
  constructor() {}
}

export class AccountConfig {
  /**
   * Epic Games login email
   * @example example@gmail.com
   * @env EMAIL
   */
  @IsEmail()
  email: string;

  /**
   * Notification options for just this account. This overrides any global notification configs.
   *
   * You may configure multiple notifiers, and they will all be triggered simultaneously.
   */
  @IsOptional()
  @ValidateNested()
  @IsArray()
  @Type(() => NotifierConfig, {
    discriminator: {
      property: 'type',
      subTypes: notifierSubtypes,
    },
  })
  notifiers?: AnyNotifierConfig[];

  /**
   * @ignore
   */
  constructor() {}
}

export enum SearchStrategy {
  /**
   * Redeem only the games defined as a weekly free game at https://www.epicgames.com/store/free-games
   *
   * This uses a different set of APIs from the other search strategies, so it may work in case finding games breaks.
   *
   * Generally is less stable than `promotion` due to a more complex lookup method.
   */
  WEEKLY = 'weekly',
  /**
   * Search the entire Epic Games site for any game with a 100% discount.
   * This includes the `weekly` games, plus any uncommon non-weekly temporarily free games.
   * Occasionally excludes the weekly promotion if it's a bundle.
   */
  PROMOTION = 'promotion',
  /**
   * Combines the results from `weekly` and `promotion`.
   * Continues if at least one of the APIs works.
   */
  ALL = 'all',
}

export enum LogLevel {
  SILENT = 'silent',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * @example ```jsonc
 * {
 *   "runOnStartup": true,
 *   "cronSchedule": "0 0,6,12,18 * * *",
 *   "logLevel": "info",
 *   "webPortalConfig": {
 *     "baseUrl": "https://epic.example.com",
 *   },
 *   "accounts": [
 *     {
 *       "email": "example@gmail.com",
 *     },
 *   ],
 *    "notifiers": [
 *      // You may configure as many of any notifier as needed
 *      // Here are some examples of each type
 *      {
 *        "type": "email",
 *        "smtpHost": "smtp.gmail.com",
 *        "smtpPort": 587,
 *        "emailSenderAddress": "hello@gmail.com",
 *        "emailSenderName": "Epic Games Free Games",
 *        "emailRecipientAddress": "hello@gmail.com",
 *        "secure": false,
 *        "auth": {
 *            "user": "hello@gmail.com",
 *            "pass": "abc123",
 *        },
 *      },
 *      {
 *        "type": "discord",
 *        "webhookUrl": "https://discord.com/api/webhooks/123456789123456789/A-abcdefghijklmn-abcdefghijklmnopqrst12345678-abcdefghijklmnop123456",
 *      },
 *      {
 *        "type": "telegram",
 *        "token": "644739147:AAGMPo-Jz3mKRnHRTnrPEDi7jUF1vqNOD5k",
 *        "chatId": "-987654321",
 *      },
 *      {
 *        "type": "apprise",
 *        "apiUrl": "http://192.168.1.2:8000",
 *        "urls": "mailto://user:pass@gmail.com",
 *      },
 *    ],
 * }
 * ```
 */
export class AppConfig {
  /**
   * Cron string of when to run the process.
   * **It is recommended to run every 6 hours, otherwise the refresh tokens will expire after 8 hours and a new login will be prompted every run.**
   * If you want the check to occur immediately after the new free game is released, you can offset the cron schedule. For example in a timezone where the free games release at 11:00am: `0 5,11,17,23 * * *`
   * @example 0 5,11,17,23 * * *
   * @default 0 0,6,12,18 * * * (every six hours)
   * @env CRON_SCHEDULE
   */
  @IsOptional()
  @IsString()
  cronSchedule = process.env.CRON_SCHEDULE || '0 0,6,12,18 * * *';

  @Expose({ toClassOnly: true })
  getMsUntilNextRun(): number {
    const cronExpression = cronParser.parseExpression(this.cronSchedule);
    return cronExpression.next().getTime() - new Date().getTime();
  }

  /**
   * A list of excluded game titles to skip during processing.
   * @example ['Gigabash Demo', 'Another Blacklisted Game']
   * @env BLACKLISTED_GAMES (comma separated)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blacklistedGames: string[] = [];

  /**
   * The search criteria for finding free games. Either the weekly promotion, and free promotion, or all free products.
   * @example weekly
   * @default all
   * @env SEARCH_STRATEGY
   */
  @IsOptional()
  @IsEnum(SearchStrategy)
  searchStrategy = (process.env.SEARCH_STRATEGY || SearchStrategy.ALL) as SearchStrategy;

  /**
   * If true, the process will run on startup in addition to the scheduled time.
   * @example true
   * @default false
   * @env RUN_ON_STARTUP
   */
  @IsOptional()
  @IsBoolean()
  runOnStartup = process.env.RUN_ON_STARTUP?.toLowerCase() === 'true' || false;

  /**
   * If true, don't schedule runs. Use with RUN_ON_STARTUP to run once and shutdown.
   * @example true
   * @default false
   * @env RUN_ONCE
   */
  @IsOptional()
  @IsBoolean()
  runOnce = process.env.RUN_ONCE?.toLowerCase() === 'true' || false;

  /**
   * TZ name from this list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
   * @example America/Chicago
   * @default UTC
   * @env TZ
   */
  @IsOptional()
  @IsString()
  timezone = process.env.TZ || 'UTC';

  /**
   * The delay interval between runs of each account in seconds. (Only effective when multiple accounts are configured)
   * @example 30
   * @default 60
   * @env INTERVAL_TIME
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  intervalTime = process.env.INTERVAL_TIME ? parseInt(process.env.INTERVAL_TIME, 10) : 60;

  /**
   * How many accounts can be processed at the same time
   * @example 1
   * @default 3
   * @env ACCOUNT_CONCURRENCY
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  accountConcurrency = process.env.ACCOUNT_CONCURRENCY
    ? parseInt(process.env.ACCOUNT_CONCURRENCY, 10)
    : 3;

  /**
   * Log level in lower case. Can be [silent, error, warn, info, debug, trace]
   * @example debug
   * @default info
   * @env LOG_LEVEL
   */
  @IsOptional()
  @IsEnum(LogLevel)
  logLevel = process.env.LOG_LEVEL || LogLevel.INFO;

  /**
   * Web server configurations for the remote web portal
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => WebPortalConfig)
  webPortalConfig?: WebPortalConfig;

  /**
   * A list of accounts to work with
   */
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => AccountConfig)
  accounts: AccountConfig[];

  /**
   * Global default notification configuration.
   *
   * You may configure multiple notifiers, and they will all be triggered simultaneously.
   */
  @IsOptional()
  @ValidateNested()
  @IsArray()
  @Type(() => NotifierConfig, {
    discriminator: {
      property: 'type',
      subTypes: notifierSubtypes,
    },
  })
  notifiers?: AnyNotifierConfig[];

  /**
   * When true, the process will send test notifications with a test redirect to example.com for all configured accounts.
   * **Be sure to disable this after a successful test.**
   * This test will block normal operation until the test link is accessed by one account. The test page can only be used once.
   * @example true
   * @default false
   * @env TEST_NOTIFIERS
   */
  @IsOptional()
  @IsBoolean()
  testNotifiers = process.env.TEST_NOTIFIERS?.toLowerCase() === 'true' || false;

  /**
   * Skip the call to api.github.com that checks for the latest version on launch
   * @example true
   * @default false
   * @env SKIP_VERSION_CHECK
   */
  @IsOptional()
  @IsBoolean()
  skipVersionCheck = process.env.SKIP_VERSION_CHECK?.toLowerCase() === 'true' || false;

  /**
   * In seconds, how long before a [stuck Chromium process](https://github.com/claabs/epicgames-freegames-node/issues/164) times out and gets restarted
   * @example 30
   * @default 15
   * @env BROWSER_LAUNCH_TIMEOUT
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  browserLaunchTimeout = process.env.BROWSER_LAUNCH_TIMEOUT
    ? parseInt(process.env.BROWSER_LAUNCH_TIMEOUT, 10)
    : 15;

  /**
   * How many times to attempt retry attempts to launch a browser after it [times out](https://github.com/claabs/epicgames-freegames-node/issues/164)
   * @example 2
   * @default 5
   * @env BROWSER_LAUNCH_RETRY_ATTEMPTS
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  browserLaunchRetryAttempts = process.env.BROWSER_LAUNCH_RETRY_ATTEMPTS
    ? parseInt(process.env.BROWSER_LAUNCH_RETRY_ATTEMPTS, 10)
    : 5;

  /**
   * How long in milliseconds the browser navigation will wait before timing out.
   * 0 disables timeout (not recommended).
   * See: https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagesetdefaulttimeouttimeout
   * @example 120000
   * @default 30000
   * @env BROWSER_NAVIGATION_TIMEOUT
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  browserNavigationTimeout = process.env.BROWSER_NAVIGATION_TIMEOUT
    ? parseInt(process.env.BROWSER_NAVIGATION_TIMEOUT, 10)
    : 30000;

  /**
   * The 2 character country code associated with your account.
   * Used when determining if a game is blacklisted for your account.
   * Commonly blacklisted countries: "MO","HK","RU","BY","CN"
   * @example RU
   * @default blacklisting is not checked
   * @env COUNTRY_CODE
   */
  @IsOptional()
  @IsString()
  countryCode = process.env.COUNTRY_CODE;

  /**
   * The Epic Games application client ID used for device code authorization to check your account's ownership of a game
   * List of available clients [here](https://github.com/Jaren8r/EpicClients).
   * @example b070f20729f84693b5d621c904fc5bc2 (Diesel - Dauntless)
   * @example e645e4b96298419cbffbfa353ebf8b82 (wexAndroidGameClient)
   * @default 98f7e42c2e3a4f86a74eb43fbb41ed39 (fortniteNewSwitchGameClient client ID)
   * @env DEVICE_AUTH_CLIENT_ID
   */
  @IsOptional()
  @IsString()
  deviceAuthClientId = process.env.DEVICE_AUTH_CLIENT_ID || '98f7e42c2e3a4f86a74eb43fbb41ed39';

  /**
   * The Epic Games application secret used for device code authorization to check your account's ownership of a game.
   * List of available clients [here](https://github.com/Jaren8r/EpicClients).
   * @example HG@XE&TGCxEJsgT#&_p2]=aRo#~>=>+c6PhR)zXP (Diesel - Dauntless)
   * @example d03089fd-628a-448a-ac39-0e8c5b022a11 (wexAndroidGameClient)
   * @default 0a2449a2-001a-451e-afec-3e812901c4d7 (fortniteNewSwitchGameClient client secret)
   * @env DEVICE_AUTH_SECRET
   */
  @IsOptional()
  @IsString()
  deviceAuthSecret = process.env.DEVICE_AUTH_SECRET || '0a2449a2-001a-451e-afec-3e812901c4d7';

  /**
   * After redirecting to a device authorization verification URL, how often the Epic Games API is polled for a successful login.
   * @example 20
   * @default 10
   * @env DEVICE_AUTH_POLL_RATE_SECONDS
   */
  @Min(1) // TODO: breaking change, set to 10
  @IsNumber()
  @IsOptional()
  deviceAuthPollRateSeconds = process.env.DEVICE_AUTH_POLL_RATE_SECONDS
    ? parseInt(process.env.DEVICE_AUTH_POLL_RATE_SECONDS, 10)
    : 10;

  /**
   * The full path where the browser automation error screenshots will be output
   * @example /errors
   * @default ${CONFIG_DIR}/errors
   * @env ERRORS_DIR
   */
  @IsOptional()
  @IsString()
  errorsDir = process.env.ERRORS_DIR || path.join(CONFIG_DIR, 'errors');

  /**
   * If false, EULA updates will be automatically accepted. If true, the user will receive a notification to accept the EULA.
   * @example true
   * @default false
   * @env NOTIFY_EULA
   */
  @IsBoolean()
  @IsOptional()
  notifyEula = process.env.NOTIFY_EULA?.toLowerCase() === 'true' || false;

  /**
   * @hidden
   */
  constructor() {
    // Use environment variables to fill one account if present
    const { EMAIL } = process.env;
    if (EMAIL) {
      const account = new AccountConfig();
      account.email = EMAIL;
      this.accounts = [account];
    }

    // Use environment variables to fill email notification config if present
    const {
      SMTP_HOST,
      SMTP_PORT,
      EMAIL_SENDER_ADDRESS,
      EMAIL_SENDER_NAME,
      EMAIL_RECIPIENT_ADDRESS,
      SMTP_SECURE,
      SMTP_USERNAME,
      SMTP_PASSWORD,
    } = process.env;
    if (
      SMTP_HOST &&
      SMTP_PORT &&
      EMAIL_SENDER_ADDRESS &&
      EMAIL_SENDER_NAME &&
      EMAIL_RECIPIENT_ADDRESS &&
      SMTP_SECURE
    ) {
      const email = new EmailConfig();
      email.smtpHost = SMTP_HOST;
      email.smtpPort = parseInt(SMTP_PORT, 10);
      email.emailSenderAddress = EMAIL_SENDER_ADDRESS;
      email.emailSenderName = EMAIL_SENDER_NAME;
      email.emailRecipientAddress = EMAIL_RECIPIENT_ADDRESS;
      email.secure = SMTP_SECURE === 'true';
      if (SMTP_USERNAME && SMTP_PASSWORD) {
        const auth = new EmailAuthConfig();
        auth.user = SMTP_USERNAME;
        auth.pass = SMTP_PASSWORD;
        email.auth = auth;
      }
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof EmailConfig)) {
        this.notifiers.push(email);
      }
    }

    // Use environment variables to fill discord notification config if present
    const { DISCORD_WEBHOOK, DISCORD_MENTIONED_USERS, DISCORD_MENTIONED_ROLES, DISCORD_SHOW_URL } =
      process.env;
    if (DISCORD_WEBHOOK) {
      const discord = new DiscordConfig();
      discord.webhookUrl = DISCORD_WEBHOOK;
      if (DISCORD_MENTIONED_USERS) discord.mentionedUsers = DISCORD_MENTIONED_USERS.split(',');
      if (DISCORD_MENTIONED_ROLES) discord.mentionedRoles = DISCORD_MENTIONED_ROLES.split(',');
      discord.showUrl = DISCORD_SHOW_URL === 'true';
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof DiscordConfig)) {
        this.notifiers.push(discord);
      }
    }

    // Use environment variables to fill pushover notification config if present
    const { PUSHOVER_TOKEN, PUSHOVER_USER_ID } = process.env;
    if (PUSHOVER_TOKEN && PUSHOVER_USER_ID) {
      const pushover = new PushoverConfig();
      pushover.token = PUSHOVER_TOKEN;
      pushover.userKey = PUSHOVER_USER_ID;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof PushoverConfig)) {
        this.notifiers.push(pushover);
      }
    }

    // Use environment variables to fill telegram notification config if present
    const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_TOPIC } = process.env;
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      const telegram = new TelegramConfig();
      telegram.token = TELEGRAM_TOKEN;
      telegram.chatId = TELEGRAM_CHAT_ID;
      telegram.topic = TELEGRAM_TOPIC ? parseInt(TELEGRAM_TOPIC, 10) : undefined;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof TelegramConfig)) {
        this.notifiers.push(telegram);
      }
    }

    // Use environment variables to fill apprise notification config if present
    const { APPRISE_API, APPRISE_URLS } = process.env;
    if (APPRISE_API) {
      const apprise = new AppriseConfig();
      apprise.apiUrl = APPRISE_API;
      apprise.urls = APPRISE_URLS;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof AppriseConfig)) {
        this.notifiers.push(apprise);
      }
    }

    // Use environment variables to fill gotify notification config if present
    const { GOTIFY_API_URL, GOTIFY_TOKEN, GOTIFY_PRIORITY } = process.env;
    if (GOTIFY_API_URL && GOTIFY_TOKEN) {
      const gotify = new GotifyConfig();
      gotify.apiUrl = GOTIFY_API_URL;
      gotify.token = GOTIFY_TOKEN;
      if (GOTIFY_PRIORITY) gotify.priority = parseInt(GOTIFY_PRIORITY, 10);
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof GotifyConfig)) {
        this.notifiers.push(gotify);
      }
    }

    // Use environment variables to fill slack notification config if present
    const { SLACK_WEBHOOK } = process.env;
    if (SLACK_WEBHOOK) {
      const slack = new SlackConfig();
      slack.webhookUrl = SLACK_WEBHOOK;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof SlackConfig)) {
        this.notifiers.push(slack);
      }
    }

    // Use environment variables to fill Ntfy notification config if present
    const { NTFY_WEBHOOK, NTFY_PRIORITY, NTFY_TOKEN } = process.env;
    if (NTFY_WEBHOOK && NTFY_PRIORITY && NTFY_TOKEN) {
      const ntfy = new NtfyConfig();
      ntfy.webhookUrl = NTFY_WEBHOOK;
      ntfy.priority = NTFY_PRIORITY;
      ntfy.token = NTFY_TOKEN;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof NtfyConfig)) {
        this.notifiers.push(ntfy);
      }
    }

    // Use environment variables to fill homeassistant notification config if present
    const {
      HOMEASSISTANT_INSTANCE,
      HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN,
      HOMEASSISTANT_NOTIFYSERVICE,
      HOMEASSISTANT_CUSTOM_DATA,
    } = process.env;
    if (
      HOMEASSISTANT_INSTANCE &&
      HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN &&
      HOMEASSISTANT_NOTIFYSERVICE
    ) {
      const homeassistant = new HomeassistantConfig();
      homeassistant.instance = HOMEASSISTANT_INSTANCE;
      homeassistant.token = HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN;
      homeassistant.notifyservice = HOMEASSISTANT_NOTIFYSERVICE;
      homeassistant.customData = HOMEASSISTANT_CUSTOM_DATA
        ? (JSON.parse(HOMEASSISTANT_CUSTOM_DATA) as Record<string, string | number | boolean>)
        : undefined;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof HomeassistantConfig)) {
        this.notifiers.push(homeassistant);
      }
    }

    // Use environment variables to fill bark notification config if present
    const { BARK_KEY, BARK_TITLE, BARK_GROUP, BARK_API_URL } = process.env;
    if (BARK_KEY) {
      const bark = new BarkConfig();
      bark.key = BARK_KEY;
      if (BARK_TITLE) bark.title = BARK_TITLE;
      if (BARK_GROUP) bark.group = BARK_GROUP;
      if (BARK_API_URL) bark.apiUrl = BARK_API_URL;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof BarkConfig)) {
        this.notifiers.push(bark);
      }
    }

    // Use environment variables to fill webhook notification config if present
    const { WEBHOOK_URL, WEBHOOK_HEADERS } = process.env;
    if (WEBHOOK_URL) {
      const webhook = new WebhookConfig();
      webhook.url = WEBHOOK_URL;
      webhook.headers = WEBHOOK_HEADERS
        ? (JSON.parse(WEBHOOK_HEADERS) as Record<string, string>)
        : undefined;
      this.notifiers ??= [];
      if (!this.notifiers.some((notifConfig) => notifConfig instanceof WebhookConfig)) {
        this.notifiers.push(webhook);
      }
    }

    // Use environment variables to fill webPortalConfig if present
    const { BASE_URL, SERVER_PORT } = process.env;
    if (BASE_URL) {
      this.webPortalConfig ??= new WebPortalConfig();
      this.webPortalConfig.baseUrl = BASE_URL;
    }
    if (SERVER_PORT) {
      this.webPortalConfig ??= new WebPortalConfig();
      this.webPortalConfig.listenOpts = {
        port: parseInt(SERVER_PORT, 10),
      };
    }

    // Use environment variables to fill blacklisted games list if present
    const { BLACKLISTED_GAMES } = process.env;
    if (BLACKLISTED_GAMES) this.blacklistedGames = BLACKLISTED_GAMES.split(',');

    // Don't let the poll rate go below 10. Remove when minimum is enforced.
    if (this.deviceAuthPollRateSeconds < 10) this.deviceAuthPollRateSeconds = 10;
  }
}
