import { outputJSON } from 'fs-extra/esm';

import { config } from './common/config/index.js';
import logger from './common/logger.js';

try {
  const { runOnStartup, runOnce, cronSchedule, timezone } = config;
  await outputJSON('/tmp/config.json', { runOnStartup, runOnce, cronSchedule, timezone });
} catch (err) {
  logger.error(err);
}
