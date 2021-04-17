import { NotificationType } from './NotificationsType';

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

type PartialEmailConfig = Partial<Omit<EmailConfig, 'auth'>> & {
  auth?: Partial<SmtpAuth>;
};

interface TelegramConfig {
  token: string;
  chatIds: string[];
}

type PartialTelegramConfig = Partial<Omit<TelegramConfig, 'chatIds'>> & {
  chatIds?: (string | undefined)[];
};

interface DiscordConfig {
  webhookUrl: string;
}

type PartialDiscordConfig = Partial<DiscordConfig>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LocalConfig {}

type PartialLocalConfig = Partial<LocalConfig>;

type ConfigBasedOnType = {
  [NotificationType.TELEGRAM]: TelegramConfig;
  [NotificationType.EMAIL]: EmailConfig;
  [NotificationType.LOCAL]: LocalConfig;
  [NotificationType.DISCORD]: DiscordConfig;
};

export {
  EmailConfig,
  PartialEmailConfig,
  TelegramConfig,
  PartialTelegramConfig,
  DiscordConfig,
  PartialDiscordConfig,
  LocalConfig,
  PartialLocalConfig,
  SmtpAuth,
  ConfigBasedOnType,
};
