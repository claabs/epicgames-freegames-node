import { NotificationType } from '../models/NotificationsType';
import {
  ConfigBasedOnType,
  DiscordConfig,
  EmailConfig,
  LocalConfig,
  PartialDiscordConfig,
  PartialEmailConfig,
  PartialLocalConfig,
  PartialTelegramConfig,
  TelegramConfig,
} from '../models/NotificationsConfig';
import { PartialConfig } from '../models/Config';

function isValidateEmail(email?: PartialEmailConfig): email is EmailConfig {
  if (!email) throw new Error('Email config is required for captcha notification');
  if (!email.smtpHost) throw new Error('Incomplete email config: smtpHost');
  if (!email.smtpPort) throw new Error('Incomplete email config: smtpPort');
  if (!email.emailSenderAddress) throw new Error('Incomplete email config: emailSenderAddress');
  if (!email.emailSenderName) throw new Error('Incomplete email config: emailSenderName');
  if (!email.emailRecipientAddress)
    throw new Error('Incomplete email config: emailRecipientAddress');
  if (email.secure === undefined) throw new Error('Incomplete email config: secure');
  if (email.auth && !email.auth.user) throw new Error('Missing user from email auth config');
  if (email.auth && !email.auth.pass) throw new Error('Missing pass from email auth config');

  return true;
}

function validateEmail({ email }: PartialConfig): EmailConfig {
  if (isValidateEmail(email)) {
    return email;
  }

  throw new Error('Invalid email config');
}

function isValidateTelegram(telegram?: PartialTelegramConfig): telegram is TelegramConfig {
  if (!telegram) throw new Error('telegram config is required for captcha notification');
  if (!telegram.token) throw new Error('Incomplete telegram config: token');
  if (!telegram.chatIds || telegram.chatIds.length < 1) {
    throw new Error('At least one telegram chatId is required');
  }
  return true;
}

function validateTelegram({ telegram }: PartialConfig): TelegramConfig {
  if (isValidateTelegram(telegram)) {
    return telegram;
  }

  throw new Error('Invalid telegram config');
}

function isValidateDiscord(discord?: PartialDiscordConfig): discord is DiscordConfig {
  if (!discord) throw new Error('discord config is required for captcha notification');
  if (!discord.webhookUrl) throw new Error('Incomplete discord config: webhookUrl');

  return true;
}

function validateDiscord({ discord }: PartialConfig): DiscordConfig {
  if (isValidateDiscord(discord)) {
    return discord;
  }

  throw new Error('Invalid telegram config');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isValidLocal(local?: PartialLocalConfig): local is LocalConfig {
  return true;
}

function validateLocal({ local }: PartialConfig): LocalConfig {
  if (isValidLocal(local)) {
    return local;
  }

  throw new Error('Invalid local config');
}

const verifyConfigBasedOnNotificationType: Record<
  NotificationType,
  (config: PartialConfig) => ConfigBasedOnType[NotificationType]
> = {
  [NotificationType.EMAIL]: validateEmail,
  [NotificationType.TELEGRAM]: validateTelegram,
  [NotificationType.LOCAL]: validateLocal,
  [NotificationType.DISCORD]: validateDiscord,
};

export default verifyConfigBasedOnNotificationType;
