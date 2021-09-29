import 'source-map-support/register';
import { config } from './common/config';

const { runOnStartup, runOnce, cronSchedule, timezone } = config;

process.stdout.write(JSON.stringify({ runOnStartup, runOnce, cronSchedule, timezone }));
