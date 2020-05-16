/* eslint-disable no-console */
import json5 from 'json5';
import fs from 'fs';
import path from 'path';
import { config as dotenv } from 'dotenv';

dotenv();

export interface Account {
  email: string;
  password: string;
  totp?: string;
}

export interface PartialConfig {
  accounts?: Partial<Account>[];
  gcpConfigName?: string;
  runOnStartup?: boolean;
  cronSchedule?: string;
  logLevel?: string;
}

export interface ConfigObject extends PartialConfig {
  accounts: Account[];
  runOnStartup: boolean;
  cronSchedule: string;
  logLevel: string;
}

const EXTENSIONS = ['json', 'json5']; // Allow .json or .json5 extension
const CONFIG_DIR = 'config';
const CONFIG_FILE_NAME = 'config';

function validateConfig(config: PartialConfig): ConfigObject {
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

    const validConfig: ConfigObject = {
      accounts: (config.accounts as unknown) as Account[], // Native type checking doesn't work through arrays?
      gcpConfigName: config.gcpConfigName,
      runOnStartup: config.runOnStartup || true,
      cronSchedule: config.cronSchedule || '0 12 * * *',
      logLevel: config.logLevel || 'info',
    };
    return validConfig;
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
  gcpConfigName: process.env.GCP_CONFIG_NAME,
  runOnStartup: Boolean(process.env.RUN_ON_STARTUP),
  cronSchedule: process.env.CRON_SCHEDULE,
  logLevel: process.env.LOG_LEVEL,
};

partialConfig = {
  ...envVarConfig,
  ...partialConfig,
};

export const config = validateConfig(partialConfig);
