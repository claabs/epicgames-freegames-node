import pino from 'pino';
import { config } from 'dotenv';

config();

const logger = pino({
  prettyPrint: {
    translateTime: `SYS:standard`,
  },
  useLevelLabels: true,
  level: process.env.LOG_LEVEL,
});

export default logger;
