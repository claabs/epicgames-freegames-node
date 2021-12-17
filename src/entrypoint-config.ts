import 'source-map-support/register';
import { outputJSONSync } from 'fs-extra';
import { config } from './common/config';
import L from './common/logger';

try {
  const { runOnStartup, runOnce, cronSchedule, timezone } = config;
  outputJSONSync('/tmp/config.json', { runOnStartup, runOnce, cronSchedule, timezone });
} catch (err) {
  L.error(err);
}
