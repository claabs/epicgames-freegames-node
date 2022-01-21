import pino from 'pino';
import { config } from './config';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: `SYS:standard`,
    },
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  level: config.logLevel,
  base: undefined,
});

export default logger;
