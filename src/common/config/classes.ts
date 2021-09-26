/* eslint-disable no-shadow */
/* eslint-disable max-classes-per-file */
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
  IsBase32,
  MinLength,
  ArrayNotEmpty,
  IsArray,
  IsPort,
} from 'class-validator';
import { ServerOptions } from 'https';
import { ListenOptions } from 'net';

export class EmailAuthConfig {
  /**
   * The SMTP username (if necessary)
   */
  @IsString()
  user: string;

  /**
   * The SMTP password (if necessary)
   */
  @IsString()
  pass: string;
}

export class EmailConfig {
  /**
   * The outgoing SMTP host name
   */
  @IsUrl()
  smtpHost: string;

  /**
   * The outgoing SMTP port (SSL or TLS, see secure)
   */
  @IsPort()
  smtpPort: number;

  /**
   * The sender of the email you will recieve (can be your email address)
   */
  @IsEmail()
  emailSenderAddress: string;

  /**
   * The name of the email sender
   */
  @IsString()
  emailSenderName: string;

  /**
   * The recipient of the email (can be your email address)
   */
  @IsEmail()
  emailRecipientAddress: string;

  /**
   * true for SSL (port 465), false for TLS or unsecure
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
}

export class NotificationConfig {
  /**
   * Settings for basic SMTP server email notifications
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailConfig)
  email?: EmailConfig;

  telegram?: boolean;
}

export class WebPortalConfig {
  /**
   * The URL base that will be returned when a captcha must be remotely solved
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  baseUrl = process.env.BASE_URL;

  /**
   * Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback
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
}

export class AccountConfig {
  /**
   * Epic Games login email
   */
  @IsEmail()
  email: string;

  /**
   * Epic Games login password
   */
  @IsString()
  @MinLength(7)
  password: string;

  /**
   * If 2FA is enabled, add your TOTP secret
   */
  @IsOptional()
  @Length(52)
  @IsBase32()
  totp?: string;

  /**
   * Confiuration options for just this account
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationConfig)
  notification?: NotificationConfig;
}

export enum SearchStrategy {
  WEEKLY = 'weekly',
  PROMOTION = 'promotion',
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

export class Config {
  /**
   * Cron string of when to run the process. If using TZ=UTC, a value of 5 16 * * * will run 5 minutes after the new games are available
   */
  @IsOptional()
  @IsString()
  cronSchedule = process.env.CRON_SCHEDULE || '0 12 * * *';

  /**
   * The search criteria for finding free games. Either the weekly promotion, and free promotion, or all free products.
   */
  @IsOptional()
  @IsEnum(SearchStrategy)
  searchStrategy = process.env.SEARCH_STRATEGY || SearchStrategy.WEEKLY;

  /**
   * If true, the process will run on startup in addition to the scheduled time.
   */
  @IsOptional()
  @IsBoolean()
  runOnStartup = process.env.RUN_ON_STARTUP?.toLowerCase() === 'true' || false;

  /**
   * The delay interval between runs of each account in seconds. (Only effective when multiple accounts are configured)
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  intervalTime = 60;

  /**
   * Log level in lower case. Can be [silent, error, warn, info, debug, trace]
   */
  @IsOptional()
  @IsEnum(LogLevel)
  logLevel = process.env.LOG_LEVEL || LogLevel.INFO;

  /**
   * A unique hCaptcha accessibility URL recieved in your email after signing up here: https://dashboard.hcaptcha.com/signup?type=accessibility
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
   * Global default notification configuration
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationConfig)
  notification?: NotificationConfig;

  /**
   * Deprecated, use `notifications.email`
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailConfig)
  email?: EmailConfig;

  /**
   * Deprecated, use `webPortalConfig.baseUrl`
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  baseUrl?: string;

  /**
   * Deprecated, use `searchStrategy`
   */
  @IsOptional()
  @IsBoolean()
  onlyWeekly = process.env.ONLY_WEEKLY?.toLowerCase() === 'true';

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
  }
}
