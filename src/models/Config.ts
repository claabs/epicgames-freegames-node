import { NotificationType } from './NotificationsType';

interface Account {
  email: string;
  password: string;
  totp?: string;
}

interface SmtpAuth {
  user: string;
  pass: string;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  emailSenderAddress: string;
  emailSenderName: string;
  emailRecipientAddress: string;
  secure: boolean;
  auth?: SmtpAuth;
}

interface TelegramConfig {
  token: string;
  chatIds: string[];
}

type PartialEmailConfig = Partial<Omit<EmailConfig, 'auth'>> & {
  auth?: Partial<SmtpAuth>;
};
type PartialTelegramConfig = Partial<Omit<TelegramConfig, 'chatIds'>> & {
  chatIds?: (string | undefined)[];
};

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
}

interface Config extends PartialConfig {
  accounts: Account[];
  onlyWeekly: boolean;
  runOnStartup: boolean;
  intervalTime?: number;
  cronSchedule: string;
  logLevel: string;
  baseUrl: string;
  serverPort: number;
  notificationType: NotificationType;
  email: EmailConfig;
  telegram: TelegramConfig;
}

export {
  Config,
  PartialConfig,
  EmailConfig,
  PartialEmailConfig,
  TelegramConfig,
  PartialTelegramConfig,
  Account,
  SmtpAuth,
};
