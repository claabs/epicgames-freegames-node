/* eslint-disable no-console */
import json5 from 'json5';
import fs from 'fs';
import path from 'path';
import verifyConfigBasedOnNotificationType from './verifyConfigBasedOnNotificationType';
import { Config, EmailConfig, PartialConfig, TelegramConfig, Account } from '../models/Config';
import { isNotificationType, NotificationType } from '../models/NotificationsType';

const EXTENSIONS = ['json', 'json5']; // Allow .json or .json5 extension
const CONFIG_DIR = 'config';
const CONFIG_FILE_NAME = 'config';

// This is required to prevent a stupid error message from node-telegram-bot-api, https://github.com/yagop/node-telegram-bot-api/issues/540
process.env.NTBA_FIX_319 = '1';

function validateConfig(config: PartialConfig): Config {
  // console.debug('Parsing config');
  try {
    if (!config.accounts || config.accounts.length < 1) {
      throw new Error('At least one account is required');
    }
    config.accounts.forEach((account, index) => {
      if (!account.email) {
        throw new Error(`Account ${index + 1} is missing email`);
      }
      if (!account.password) {
        throw new Error(`Account ${index + 1} is missing password`);
      }
    });

    if (!isNotificationType(config.notificationType))
      throw new Error('Missing notification type config');

    verifyConfigBasedOnNotificationType[config.notificationType](config);

    return {
      accounts: config.accounts as Account[],
      onlyWeekly: config.onlyWeekly || false,
      runOnStartup: config.runOnStartup || true,
      intervalTime: config.intervalTime || 60,
      cronSchedule: config.cronSchedule || '0 12 * * *',
      logLevel: config.logLevel || 'info',
      baseUrl: config.baseUrl || 'http://localhost:3000',
      serverPort: config.serverPort || 3000,
      notificationType: NotificationType[config.notificationType],
      email: config.email as EmailConfig,
      telegram: config.telegram as TelegramConfig,
    };
  } catch (err) {
    // Can't use pino here due to circular dependency
    console.error(`CONFIGURATION ERROR: ${err.message}`);
    throw err;
  }
}

const configPaths = EXTENSIONS.map(ext => path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}.${ext}`));

const configPath = configPaths.find(p => fs.existsSync(p));

let partialConfig: PartialConfig = {};
if (configPath) {
  partialConfig = json5.parse(fs.readFileSync(configPath, 'utf8'));
  if (partialConfig.accounts?.length === 0) {
    delete partialConfig.accounts; // Using undefined will spread overwrite incorrectly
  }
}

const envVarConfig: PartialConfig = {
  accounts: [
    {
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
      totp: process.env.TOTP,
    },
  ],
  onlyWeekly: process.env.ONLY_WEEKLY ? process.env.ONLY_WEEKLY === 'true' : undefined,
  runOnStartup: process.env.RUN_ON_STARTUP ? process.env.RUN_ON_STARTUP === 'true' : undefined,
  intervalTime: Number(process.env.INTERVAL_TIME),
  cronSchedule: process.env.CRON_SCHEDULE,
  logLevel: process.env.LOG_LEVEL,
  baseUrl: process.env.BASE_URL,
  serverPort: Number(process.env.SERVER_PORT),
  notificationType: process.env.NOTIFICATION_TYPE,
  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT),
    emailSenderAddress: process.env.EMAIL_SENDER_ADDRESS,
    emailSenderName: process.env.EMAIL_SENDER_NAME,
    emailRecipientAddress: process.env.EMAIL_RECIPIENT_ADDRESS,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  },
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    chatIds: [process.env.TELEGRAM_CHAT_ID],
  },
};

partialConfig = {
  ...envVarConfig,
  ...partialConfig,
};

const config = validateConfig(partialConfig);

export default config;
