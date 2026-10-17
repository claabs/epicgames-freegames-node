import { outputJSON } from 'fs-extra/esm';

import { config } from './common/config/index.ts';
import logger from './common/logger.ts';

try {
  const { runOnStartup, runOnce, cronSchedule, timezone } = config;
  await outputJSON('/tmp/config.json', { runOnStartup, runOnce, cronSchedule, timezone });
} catch (err) {
  logger.error(err);
}
