import { outputJSONSync } from 'fs-extra/esm';
import { config } from './common/config/index.js';
import L from './common/logger.js';

try {
  const { runOnStartup, runOnce, cronSchedule, timezone } = config;
  outputJSONSync('/tmp/config.json', { runOnStartup, runOnce, cronSchedule, timezone });
} catch (err) {
  L.error(err);
}
