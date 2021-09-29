import 'source-map-support/register';
import { writeFileSync } from 'fs';
import { config } from './common/config';

const { runOnStartup, runOnce, cronSchedule, timezone } = config;

writeFileSync(
  '/tmp/config.json',
  JSON.stringify({ runOnStartup, runOnce, cronSchedule, timezone }),
  'utf-8'
);
