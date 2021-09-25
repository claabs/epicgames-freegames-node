/* eslint-disable no-console */

import { config as dotenv } from 'dotenv';
import json5 from 'json5';
import path from 'path';
import fs from 'fs-extra';
import { validateSync } from 'class-validator';
import { Config } from './config-classes';

const EXTENSIONS = ['json', 'json5']; // Allow .json or .json5 extension
const CONFIG_DIR = 'config';
const CONFIG_FILE_NAME = 'config';

dotenv();

const configPaths = EXTENSIONS.map((ext) => path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}.${ext}`));
const configPath = configPaths.find((p) => fs.existsSync(p));
if (!configPath) {
  // TODO: Create default config.json
  throw new Error('No config file detected');
}
const config: Config = json5.parse(fs.readFileSync(configPath, 'utf8'));

const errors = validateSync(config);
if (errors.length > 0) {
  throw errors;
}

/**
 * Handle deprecated options
 */
if (config.email) {
  console.warn(
    'WARNING: `email` has been deprecateed. Please update your config to use `notification.email` instead'
  );
  const depValue = config.notification?.email;
  if (!depValue) {
    config.notification = {
      ...config.notification,
      email: depValue,
    };
  }
}

if (config.baseUrl) {
  console.warn(
    'WARNING: `baseUrl` has been deprecateed. Please update your config to use `webPortalConfig.baseUrl` instead'
  );
  const depValue = config.webPortalConfig?.baseUrl;
  if (!depValue) {
    config.webPortalConfig = {
      ...config.webPortalConfig,
      baseUrl: depValue,
    };
  }
}

if (config.onlyWeekly) {
  console.warn(
    'WARNING: `onlyWeekly` has been deprecateed. Please update your config to use `searchStrategy` instead'
  );
  const depValue = config.searchStrategy;
  if (!depValue) {
    const newValue = depValue ? 'weekly' : 'promotion';
    config.searchStrategy = newValue;
  }
}

console.log('Config:', JSON.stringify(config, null, 2));

export default config;
