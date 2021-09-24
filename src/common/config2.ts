/* eslint-disable no-console */
import convict from 'convict';
import { url, email } from 'convict-format-with-validator';
import { config as dotenv } from 'dotenv';
import json5 from 'json5';
import path from 'path';
import fs from 'fs-extra';

const EXTENSIONS = ['json', 'json5']; // Allow .json or .json5 extension
const CONFIG_DIR = 'config';
const CONFIG_FILE_NAME = 'config';

dotenv();
convict.addParser({ extension: EXTENSIONS, parse: json5.parse });
// TODO: Add more parsers? (YAML)

convict.addFormat(email);
convict.addFormats({
  accounts: {
    validate: (sources, schema) => {
      if (!Array.isArray(sources)) {
        throw new Error('must be of type Array');
      }

      sources.forEach((source) => {
        convict(schema.children).load(source).validate();
      });
    },
  },
  'nullable-url': {
    coerce: (v) => v.toString(),
    validate: (sources, schema) => {
      if (sources === null) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      url.validate!(sources, schema);
    },
  },
  'nullable-email': {
    coerce: (v) => v.toString(),
    validate: (sources, schema) => {
      if (sources === null) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      email.validate!(sources, schema);
    },
  },
  'nullable-boolean': {
    coerce: (v) => String(v).toLowerCase() === 'true',
    validate: (sources) => {
      if (sources === null) return;
      if (
        // eslint-disable-next-line no-new-wrappers
        Object.prototype.toString.call(sources) !== Object.prototype.toString.call(new Boolean())
      ) {
        throw new Error('must be of type Boolean');
      }
    },
  },
  'hcaptcha-url': {
    coerce: (v) => v.toString(),
    validate: (sources, schema) => {
      if (sources === null) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      url.validate!(sources, schema);
      const hCaptchaUrlPattern =
        /https:\/\/accounts\.hcaptcha\.com\/verify_email\/[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-4[0-9A-Za-z]{3}-[89ABab][0-9A-Za-z]{3}-[0-9A-Za-z]{12}/;
      if (!hCaptchaUrlPattern.test(sources)) {
        throw new Error('must be a valid hCaptcha URL');
      }
    },
  },
  totp: {
    coerce: (v) => v.toString(),
    validate: (sources) => {
      if (sources === null) return;
      if (typeof sources !== 'string') {
        throw new Error('must be a string');
      }
      if (sources.length !== 52) {
        throw new Error('must be 52 characters long');
      }
      // TODO: Regex test for base32 characters?
    },
  },
});

const configPaths = EXTENSIONS.map((ext) => path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}.${ext}`));
const configPath = configPaths.find((p) => fs.existsSync(p));
if (!configPath) {
  // TODO: Create default config.json
  throw new Error('No config file detected');
}

const emailSchema = {
  nullable: true,
  default: null,
  // format: '*',
  smtpHost: {
    doc: 'The outgoing SMTP host name',
    format: String,
    default: null,
    env: 'SMTP_HOST',
  },
  smtpPort: {
    doc: 'The outgoing SMTP port (SSL or TLS, see secure)',
    format: 'port',
    default: 587,
    env: 'SMTP_PORT',
  },
  emailSenderAddress: {
    doc: 'The sender of the email you will recieve (can be your email address)',
    format: 'nullable-email',
    default: null,
    env: 'EMAIL_SENDER_ADDRESS',
  },
  emailSenderName: {
    doc: 'The name of the email sender',
    format: String,
    default: 'Epic Games Free Games',
    env: 'EMAIL_SENDER_NAME',
  },
  emailRecipientAddress: {
    doc: 'The recipient of the email (can be your email address)',
    format: 'email',
    default: null,
    env: 'EMAIL_RECIPIENT_ADDRESS',
  },
  secure: {
    doc: 'true for SSL (port 465), false for TLS or unsecure',
    format: Boolean,
    default: false,
    env: 'SMTP_SECURE',
  },
  auth: {
    user: {
      doc: 'The SMTP username (if necessary)',
      format: String,
      default: null,
      nullable: true,
      env: 'SMTP_USERNAME',
    },
    pass: {
      doc: 'The SMTP password (if necessary)',
      format: String,
      default: null,
      nullable: true,
      env: 'SMTP_PASSWORD',
    },
  },
};

// Define a schema
const config = convict({
  cronSchedule: {
    doc: 'Cron string of when to run the process. If using TZ=UTC, a value of 5 16 * * * will run 5 minutes after the new games are available',
    format: String,
    default: '0 12 * * *',
    env: 'CRON_SCHEDULE',
  },
  searchStrategy: {
    doc: 'The search criteria for finding free games. Either the weekly promotion, and free promotion, or all free products.',
    format: ['weekly', 'promotion', 'all'],
    default: 'weekly',
    env: 'SEARCH_STRATEGY',
  },
  runOnStartup: {
    doc: 'If true, the process will run on startup in addition to the scheduled time.',
    format: Boolean,
    default: false,
    env: 'RUN_ON_STARTUP',
  },
  intervalTime: {
    doc: 'The delay interval between runs of each account in seconds. (Only effective when multiple accounts are configured)',
    format: Number,
    default: 60,
    env: 'INTERVAL_TIME',
  },
  logLevel: {
    doc: 'The port to bind.',
    format: ['silent', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'info',
    env: 'LOG_LEVEL',
  },
  hcaptchaAccessibilityUrl: {
    doc: 'A unique hCaptcha accessibility URL recieved in your email after signing up here: https://dashboard.hcaptcha.com/signup?type=accessibility',
    format: 'hcaptcha-url',
    env: 'HCAPTCHA_ACCESSIBILITY_URL',
    nullable: true,
    default: null,
  },
  webPortalConfig: {
    baseUrl: {
      env: 'BASE_URL',
      doc: 'The URL base that will be returned when a captcha must be remotely solved',
      format: 'nullable-url',
      default: null,
      nullable: true,
    },
    listenOpts: {
      doc: 'Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback',
      format: Object,
      default: {},
      nullable: true,
    },
    serverOpts: {
      doc: 'Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback',
      format: Object,
      default: {},
      nullable: true,
    },
  },
  puppeteerPurchase: {
    doc: 'Default to purchasing games using browser automation',
    format: Boolean,
    default: false,
    env: 'PUPPETEER_PURCHASE',
  },

  accounts: {
    doc: 'A list of accounts to work with',
    default: [],
    format: 'accounts',
    children: {
      email: {
        env: 'EMAIL',
        doc: 'Epic Games login email',
        format: 'email',
        default: null,
      },
      password: {
        env: 'PASSWORD',
        doc: 'Epic Games login password',
        format: String,
        sensitive: true,
        default: null,
      },
      totp: {
        env: 'TOTP',
        doc: 'If 2FA is enabled, add your TOTP secret',
        default: null,
        format: 'totp',
        nullable: true,
      },
    },
    baseUrl: {
      env: 'BASE_URL',
      doc: 'The URL base that will be returned when a captcha must be remotely solved',
      format: 'nullable-url',
      default: null,
      nullable: true,
    },
    listenOpts: {
      doc: 'Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback',
      format: Object,
      default: null,
      nullable: true,
    },
    serverOpts: {
      doc: 'Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback',
      format: Object,
      default: null,
      nullable: true,
    },
  },
  notifications: {
    email: emailSchema,
    telegram: {},
  },
  // Deprecated options:
  email: {
    ...emailSchema,
    doc: 'Deprecated, use `notifications.email`',
  },
  baseUrl: {
    doc: 'Deprecated, use `webPortalConfig.baseUrl`',
    format: 'nullable-url',
    default: null,
    nullable: true,
  },
  onlyWeekly: {
    doc: 'Deprecated, use `searchStrategy`',
    format: 'nullable-boolean',
    default: null,
    env: 'ONLY_WEEKLY',
    nullable: true,
  },
})
  .loadFile(configPath)
  .validate();

console.log('Schema:', config.getSchemaString());

/**
 * Handle deprecated options
 */
if (config.get('email') !== null) {
  console.warn(
    'WARNING: `email` has been deprecateed. Please update your config to use `notifications.email` instead'
  );
  const depValue = config.get('notifications.email');
  if (depValue == null) {
    config.set('notifications.email', depValue);
  }
}

if (config.get('baseUrl') !== null) {
  console.warn(
    'WARNING: `baseUrl` has been deprecateed. Please update your config to use `webPortalConfig.baseUrl` instead'
  );
  const depValue = config.get('webPortalConfig.baseUrl');
  if (depValue == null) {
    config.set('webPortalConfig.baseUrl', depValue);
  }
}

if (config.get('onlyWeekly') !== null) {
  console.warn(
    'WARNING: `onlyWeekly` has been deprecateed. Please update your config to use `searchStrategy` instead'
  );
  const depValue = config.get('searchStrategy');
  if (depValue == null) {
    const newValue = depValue ? 'weekly' : 'promotion';
    config.set('searchStrategy', newValue);
  }
}

console.log('Config:', config.toString());

export default config;
