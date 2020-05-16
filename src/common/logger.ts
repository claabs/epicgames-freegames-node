import pino from 'pino';
import { config } from './config';

const logger = pino({
  prettyPrint: {
    translateTime: `SYS:standard`,
  },
  useLevelLabels: true,
  level: config.logLevel,
});

export default logger;
