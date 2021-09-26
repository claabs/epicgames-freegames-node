/* eslint-disable no-console, import/prefer-default-export */

import { config as dotenv } from 'dotenv';
import json5 from 'json5';
import path from 'path';
import fs from 'fs-extra';
import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { plainToClass, classToPlain } from 'class-transformer';
import { Config } from './classes';

const EXTENSIONS = ['json', 'json5']; // Allow .json or .json5 extension
const CONFIG_DIR = 'config';
const CONFIG_FILE_NAME = 'config2';

dotenv();

const configPaths = EXTENSIONS.map((ext) => path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}.${ext}`));
const configPath = configPaths.find((p) => fs.existsSync(p));
let parsedConfig = {};
if (!configPath) {
  // TODO: Create default config.json
  console.warn('No config file detected');
} else {
  parsedConfig = json5.parse(fs.readFileSync(configPath, 'utf8'));
}

export const config = plainToClass(Config, parsedConfig);

/**
 * Handle deprecated options
 */
if (config.email) {
  console.warn(
    'WARNING: `email` has been deprecateed. Please update your config to use `notification.email` instead'
  );
  if (!config.notification?.email) {
    config.notification = {
      ...config.notification,
      email: config.email,
    };
  }
}

if (config.baseUrl) {
  console.warn(
    'WARNING: `baseUrl` has been deprecateed. Please update your config to use `webPortalConfig.baseUrl` instead'
  );
  if (!config.webPortalConfig?.baseUrl) {
    config.webPortalConfig = {
      ...config.webPortalConfig,
      baseUrl: config.baseUrl,
    };
  }
}

if (config.onlyWeekly) {
  console.warn(
    'WARNING: `onlyWeekly` has been deprecateed. Please update your config to use `searchStrategy` instead'
  );
  if (!config.searchStrategy) {
    const newValue = config.onlyWeekly ? 'weekly' : 'promotion';
    config.searchStrategy = newValue;
  }
}

const errors = validateSync(config, {
  validationError: {
    target: false,
  },
});
if (errors.length > 0) {
  errors.forEach((error) => console.error('Validation error:', JSON.stringify(error, null, 2)));
  throw new Error('Invalid config');
}

// console.log('Config:', JSON.stringify(classToPlain(config), null, 2));
