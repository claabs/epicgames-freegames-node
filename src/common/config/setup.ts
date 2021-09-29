import 'reflect-metadata';
import { config as dotenv } from 'dotenv';
import json5 from 'json5';
import path from 'path';
import fs from 'fs-extra';
import { validateSync } from 'class-validator';
import { plainToClass, classToPlain } from 'class-transformer';
import pino from 'pino';
import { Config, EmailConfig, WebPortalConfig } from './classes';

dotenv();

// Declare pino logger as importing would cause dependency cycle
const L = pino({
  prettyPrint: {
    translateTime: `SYS:standard`,
  },
  useLevelLabels: true,
  level: process.env.LOG_LEVEL || 'info',
});

// TODO: Add YAML parser
const EXTENSIONS = ['.json', '.json5']; // Allow .json or .json5 extension

const removeFileExtension = (filename: string): string => {
  const ext = path.extname(filename);
  if (EXTENSIONS.includes(ext)) {
    return path.basename(filename, ext);
  }
  return path.basename(filename);
};

export const CONFIG_DIR = process.env.CONFIG_DIR || 'config';
export const CONFIG_FILE_NAME = process.env.CONFIG_FILE_NAME
  ? removeFileExtension(process.env.CONFIG_FILE_NAME)
  : 'config';

const configPaths = EXTENSIONS.map((ext) => path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}${ext}`));
const configPath = configPaths.find((p) => fs.existsSync(p));
// eslint-disable-next-line import/no-mutable-exports
let config: Config;
if (!configPath) {
  L.warn('No config file detected');
  const newConfigPath = path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}.json`);
  config = new Config();
  try {
    L.debug({ newConfigPath }, 'Creating new config file');
    fs.writeJSONSync(newConfigPath, classToPlain(config), { spaces: 2 });
    L.info({ newConfigPath }, 'Wrote new default config file');
  } catch (err) {
    L.debug(err);
    L.info('Not allowed to create new config. Continuing...');
  }
} else {
  L.debug({ configPath });
  const parsedConfig = json5.parse(fs.readFileSync(configPath, 'utf8'));
  config = plainToClass(Config, parsedConfig);
}

/**
 * Handle deprecated options
 */
if (config.email) {
  L.warn('`email` has been deprecated. Please update your config to use `notifications` instead');
  if (!config.notifiers) {
    config.notifiers = [];
  }
  if (!config.notifiers.some((notifConfig) => notifConfig instanceof EmailConfig)) {
    config.notifiers.push(config.email);
  }
}

if (config.baseUrl) {
  L.warn(
    '`baseUrl` has been deprecated. Please update your config to use `webPortalConfig.baseUrl` instead'
  );
  if (!config.webPortalConfig) {
    config.webPortalConfig = new WebPortalConfig();
  }
  if (!config.webPortalConfig.baseUrl) {
    config.webPortalConfig.baseUrl = config.baseUrl;
  }
}

if (config.onlyWeekly) {
  L.warn(
    '`onlyWeekly` has been deprecated. Please update your config to use `searchStrategy` instead'
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
  L.error({ errors }, 'Validation error(s)');
  throw new Error('Invalid config');
}

L.debug({ config: classToPlain(config) });

export { config };
