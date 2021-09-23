/* eslint-disable import/prefer-default-export */
import convict from 'convict';
import { url, email } from 'convict-format-with-validator';
import { config as dotenv } from 'dotenv';
import json5 from 'json5';

dotenv();
convict.addParser({ extension: 'json', parse: json5.parse });

convict.addFormat(url);
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
  notification: {
    // TODO
    validate: (sources, schema) => {
      if (!Array.isArray(sources)) {
        throw new Error('must be of type Array');
      }

      sources.forEach((source) => {
        convict(schema.children).load(source).validate();
      });
    },
  },
});

// Define a schema
export const config = convict({
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
    format: 'url',
    env: 'HCAPTCHA_ACCESSIBILITY_URL',
  },
  webPortalConfig: {
    baseUrl: {
      env: 'BASE_URL',
      doc: 'The URL base that will be returned when a captcha must be remotely solved',
      format: 'url',
      default: 'http://localhost:3000',
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
  email: {
    doc: 'The port to bind.',
    format: 'port',
    default: 8080,
    env: 'PORT',
    arg: 'port',
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
      },
      password: {
        env: 'PASSWORD',
        doc: 'Epic Games login password',
        format: String,
        sensitive: true,
      },
      totp: {
        env: 'TOTP',
        doc: 'If 2FA is enabled, add your TOTP secret',
        format: String,
        length: 52,
        nullable: true,
      },
    },
    baseUrl: {
      env: 'BASE_URL',
      doc: 'The URL base that will be returned when a captcha must be remotely solved',
      format: 'url',
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
});

config.validate();
