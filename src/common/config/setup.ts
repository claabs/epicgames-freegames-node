import path from 'node:path';

import { CronExpressionParser } from 'cron-parser';
import 'dotenv/config';
import fs from 'fs-extra';
import json5 from 'json5';
import { pino } from 'pino';

import { appConfigSchema, CONFIG_DIR } from './zod.ts';

import type z from 'zod';

import type { AppConfig, AppConfigInput } from './zod.ts';

// Declare pino logger as importing would cause dependency cycle
const L = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:standard',
    },
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
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

export const CONFIG_FILE_NAME = process.env.CONFIG_FILE_NAME
  ? removeFileExtension(process.env.CONFIG_FILE_NAME)
  : 'config';

const configPaths = EXTENSIONS.map((ext) => path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}${ext}`));
const existingPaths = await Promise.all(
  configPaths.map(async (p) => ((await fs.exists(p)) ? p : undefined)),
);
const configPath = existingPaths.find(Boolean);

const defaultConfig: AppConfigInput = {
  accounts: [{ email: 'youremailhere' }],
  notifiers: [
    {
      type: 'discord',
      webhookUrl: 'configure a notifier',
    },
  ],
};

let configParseResult: z.ZodSafeParseResult<AppConfig>;

if (configPath) {
  L.debug({ configPath }, 'Reading existing config file');
  let configRaw: string;
  try {
    configRaw = await fs.readFile(configPath, 'utf8');
  } catch (error) {
    L.error(error, `Unable to read ${configPath}. Fix the permissions and restart.`);
    throw error;
  }
  const parsedConfig = json5.parse<unknown>(configRaw);
  configParseResult = appConfigSchema.safeParse(parsedConfig);
} else {
  L.info('No config file detected, checking if valid with environment variables');
  configParseResult = appConfigSchema.safeParse({});

  if (!configParseResult.success) {
    L.warn(
      { errors: configParseResult.error },
      'Config invalid with only environment variables. Creating default config for user convenience',
    );

    const newConfigPath = path.resolve(CONFIG_DIR, `${CONFIG_FILE_NAME}.json`);
    try {
      L.debug({ newConfigPath }, 'Creating new config file');
      await fs.writeJSON(newConfigPath, defaultConfig, { spaces: 2 });
      L.info({ newConfigPath }, 'Wrote new default config file');
    } catch (error) {
      L.warn({ err: error }, 'Not allowed to create new config.');
    }
    L.warn(`New config generated at ${newConfigPath}. Populate it with your details and restart.`);
  }
}

if (configParseResult.error) {
  L.error({ err: configParseResult.error }, 'Config validation error(s)');
  throw new Error('Invalid config');
}

const config = configParseResult.data;
L.debug({ config });

const { cronSchedule } = config;
const cronExpression = CronExpressionParser.parse(cronSchedule);
const prevDate = cronExpression.prev();
const nextDate = cronExpression.next();
const cronIntervalMs = nextDate.getTime() - prevDate.getTime();
const intervalMinimumMs = 7 * 60 * 60 * 1000; // 7 hours
if (cronIntervalMs > intervalMinimumMs) {
  L.warn(
    { yourCronSchedule: cronSchedule, everySixCronSchedule: '0 0,6,12,18 * * *' },
    'Your cronSchedule configuration is not set to run often enough to ensure the device auth refresh token can stay valid. This can result in device auth login prompts being sent on every run. It is recommended to set the cron schedule to run every 6 hours.',
  );
}

export { config };

export function getMsUntilNextRun(): number {
  return CronExpressionParser.parse(config.cronSchedule).next().getTime() - Date.now();
}
