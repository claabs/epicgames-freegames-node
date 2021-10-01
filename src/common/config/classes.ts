/* eslint-disable @typescript-eslint/no-empty-function, no-useless-constructor, max-classes-per-file */
import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsUrl,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  Matches,
  IsObject,
  Length,
  MinLength,
  ArrayNotEmpty,
  IsArray,
  Max,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { ServerOptions } from 'https';
import { ListenOptions } from 'net';

export enum NotificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  LOCAL = 'local',
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
 * Sends a message to a server text channel using a webhook
 */
export class DiscordConfig extends NotifierConfig {
  /**
   * Discord channel webhook URL.
   * Guide: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks
   * @example https://discord.com/api/webhooks/123456789123456789/A-abcdefghijklmn-abcdefghijklmnopqrst12345678-abcdefghijklmnop123456
   */
  @IsUrl()
  @Matches(/^.*(discord|discordapp)\.com\/api\/webhooks\/([\d]+)\/([a-zA-Z0-9_-]+)$/)
  webhookUrl: string;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.DISCORD);
  }
}

/**
 * Sends a message to a group chat using a bot you must set up yourself
 */
export class TelegramConfig extends NotifierConfig {
  /**
   * Telegram bot token obtained here: https://core.telegram.org/bots#3-how-do-i-create-a-bot
   * @example 644739147:AAGMPo-Jz3mKRnHRTnrPEDi7jUF1vqNOD5k
   */
  @IsString()
  @Matches(/[0-9]{9}:[a-zA-Z0-9_-]{35}/)
  token: string;

  /**
   * Unique identifier for the target chat or username of the target channel
   * @example -987654321
   * @example @channelusername
   */
  @IsString()
  @IsNotEmpty()
  chatId: string;

  /**
   * @ignore
   */
  constructor() {
    super(NotificationType.TELEGRAM);
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
  @IsUrl()
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
   * @example Epic Games Captchas
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

export class NotificationConfig {
  /**
   * Settings for basic SMTP server email notifications
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailConfig)
  email?: EmailConfig;

  /**
   * @ignore
   */
  constructor() {}
}

export class WebPortalConfig {
  /**
   * The URL base that will be returned when a captcha must be remotely solved
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
   * Epic Games login password
   * @example abc1234
   * @env PASSWORD
   */
  @IsString()
  @MinLength(7)
  password: string;

  /**
   * If 2FA is enabled, add your TOTP secret
   * @example EMNCF83ULU3K3PXPJBSWY3DPEHPK3PXPJWY3DPEHPK3YI69R39NE
   * @env TOTP
   */
  @IsOptional()
  @Length(52)
  @Matches(/^[A-Z2-7]+=*$/) // IsBase32 also checks for mod 8 length, which these aren't
  totp?: string;

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
      subTypes: [
        { value: EmailConfig, name: NotificationType.EMAIL },
        { value: DiscordConfig, name: NotificationType.DISCORD },
        { value: LocalConfig, name: NotificationType.LOCAL },
        { value: TelegramConfig, name: NotificationType.TELEGRAM },
      ],
    },
  })
  notifiers?: (EmailConfig | DiscordConfig | LocalConfig | TelegramConfig)[];

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
   */
  WEEKLY = 'weekly',
  /**
   * Search the entire Epic Games site for any game with a 100% discount. This includes the `weekly` games, plus any uncommon non-weekly temporarily free games.
   */
  PROMOTION = 'promotion',
  /**
   * **Currently unimplemented**
   *
   * Redeem any and all free games, regardless of discount. WARNING: this will get a lot of junk and is not recommended!
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
 *   "searchStrategy": "promotion",
 *   "runOnStartup": true,
 *   "cronSchedule": "5 16 * * *",
 *   "logLevel": "info",
 *   "hcaptchaAccessibilityUrl": "https://accounts.hcaptcha.com/verify_email/96e9d77b-21eb-463d-9a21-75237fb27b6c",
 *   "webPortalConfig": {
 *     "baseUrl": "https://epic.exmaple.com",
 *   },
 *   "accounts": [
 *     {
 *       "email": "example@gmail.com",
 *       "password": "abc1234",
 *       "totp": "EMNCF83ULU3K3PXPJBSWY3DPEHPK3PXPJWY3DPEHPK3YI69R39NE"
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
 *        "emailSenderName": "Epic Games Captchas",
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
 *      }
 *    ],
 * }
 * ```
 */
export class Config {
  /**
   * Cron string of when to run the process. If using TZ=UTC, a value of 5 16 * * * will run 5 minutes after the new games are available
   * @example 5 16 * * *
   * @default 0 12 * * *
   * @env CRON_SCHEDULE
   */
  @IsOptional()
  @IsString()
  cronSchedule = process.env.CRON_SCHEDULE || '0 12 * * *';

  /**
   * The search criteria for finding free games. Either the weekly promotion, and free promotion, or all free products.
   * @example weekly
   * @default promotion
   * @env SEARCH_STRATEGY
   */
  @IsOptional()
  @IsEnum(SearchStrategy)
  searchStrategy = process.env.SEARCH_STRATEGY || SearchStrategy.PROMOTION;

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
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  intervalTime = 60;

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
   * A unique hCaptcha accessibility URL recieved in your email after signing up here: https://dashboard.hcaptcha.com/signup?type=accessibility
   * @example https://accounts.hcaptcha.com/verify_email/96e9d77b-21eb-463d-9a21-75237fb27b6c
   * @env HCAPTCHA_ACCESSIBILITY_URL
   */
  @IsOptional()
  @IsUrl()
  @Matches(
    /https:\/\/accounts\.hcaptcha\.com\/verify_email\/[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-4[0-9A-Za-z]{3}-[89ABab][0-9A-Za-z]{3}-[0-9A-Za-z]{12}/
  )
  hcaptchaAccessibilityUrl = process.env.HCAPTCHA_ACCESSIBILITY_URL;

  /**
   * Web server configurations for the remote web portal
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => WebPortalConfig)
  webPortalConfig?: WebPortalConfig;

  /**
   * Default to purchasing games using browser automation
   * @example true
   * @default false
   * @env PUPPETEER_PURCHASE
   */
  @IsOptional()
  @IsBoolean()
  puppeteerPurchase = process.env.PUPPETEER_PURCHASE?.toLowerCase() === 'true' || false;

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
      subTypes: [
        { value: EmailConfig, name: NotificationType.EMAIL },
        { value: DiscordConfig, name: NotificationType.DISCORD },
        { value: LocalConfig, name: NotificationType.LOCAL },
        { value: TelegramConfig, name: NotificationType.TELEGRAM },
      ],
    },
  })
  notifiers?: (EmailConfig | DiscordConfig | LocalConfig | TelegramConfig)[];

  /**
   * Number of hours to wait for a response for a notification.
   * The notification wait is blocking, so while other accounts will still continue, the process won't exit until all captcha requests are solved.
   * If the timeout is reached, the process will exit, and the URL in the notification will be inaccessible.
   * @example 168
   * @default 24
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  notificationTimeoutHours = 24;

  /**
   * Deprecated, use {@link Config.notifiers|`notifiers` with `"type": "email"`}
   * @deprecated
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailConfig)
  email?: EmailConfig;

  /**
   * Deprecated, use {@link WebPortalConfig.baseUrl|`webPortalConfig.baseUrl`}
   * @deprecated
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  baseUrl?: string;

  /**
   * Deprecated, use {@link Config.searchStrategy|`searchStrategy`}
   * @deprecated
   * @env ONLY_WEEKLY
   */
  @IsOptional()
  @IsBoolean()
  onlyWeekly = process.env.ONLY_WEEKLY
    ? process.env.ONLY_WEEKLY?.toLowerCase() === 'true'
    : undefined;

  /**
   * @hidden
   */
  constructor() {
    // Use environment variables to fill one account if present
    const { EMAIL, PASSWORD, TOTP } = process.env;
    if (EMAIL && PASSWORD) {
      const account = new AccountConfig();
      account.email = EMAIL;
      account.password = PASSWORD;
      account.totp = TOTP;
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
      if (!this.notifiers) {
        this.notifiers = [];
      }
      this.notifiers.push(email);
    }

    // Use environment variables to fill webPortalConfig if present
    const { BASE_URL, SERVER_PORT } = process.env;
    if (BASE_URL) {
      if (!this.webPortalConfig) {
        this.webPortalConfig = new WebPortalConfig();
      }
      this.webPortalConfig.baseUrl = BASE_URL;
    }
    if (SERVER_PORT) {
      if (!this.webPortalConfig) {
        this.webPortalConfig = new WebPortalConfig();
      }
      this.webPortalConfig.listenOpts = {
        port: parseInt(SERVER_PORT, 10),
      };
    }
  }
}
