import { NotificationType } from './NotificationsType';
import {
  PartialDiscordConfig,
  PartialEmailConfig,
  PartialLocalConfig,
  PartialTelegramConfig,
} from './NotificationsConfig';
import NotificationConfig from '../config/notificationConfig';

interface Account {
  email: string;
  password: string;
  totp?: string;
}

interface PartialConfig {
  accounts?: Partial<Account>[];
  onlyWeekly?: boolean;
  runOnStartup?: boolean;
  intervalTime?: number;
  cronSchedule?: string;
  logLevel?: string;
  baseUrl?: string;
  serverPort?: number;
  notificationType?: string;
  email?: PartialEmailConfig;
  telegram?: PartialTelegramConfig;
  discord?: PartialDiscordConfig;
  local?: PartialLocalConfig;
}

interface Config {
  accounts: Account[];
  onlyWeekly: boolean;
  runOnStartup: boolean;
  intervalTime?: number;
  cronSchedule: string;
  logLevel: string;
  baseUrl: string;
  serverPort: number;
  notificationType: NotificationType;
  notificationConfig: NotificationConfig;
}

export { Config, PartialConfig, Account };
