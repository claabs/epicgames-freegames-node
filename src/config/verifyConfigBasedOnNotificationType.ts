import { PartialConfig } from '../models/Config';
import { NotificationType } from '../models/NotificationsType';

function validateEmail({ email }: PartialConfig): void {
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
}

function validateTelegram({ telegram }: PartialConfig): void {
  if (!telegram) throw new Error('telegram config is required for captcha notification');
  if (!telegram.token) throw new Error('Incomplete telegram config: token');
  if (!telegram.chatIds || telegram.chatIds.length < 1) {
    throw new Error('At least one telegram chatId is required');
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function validateLocal(): void {}

const verifyConfigBasedOnNotificationType: Record<
  NotificationType,
  (config: PartialConfig) => void
> = {
  [NotificationType.EMAIL]: validateEmail,
  [NotificationType.TELEGRAM]: validateTelegram,
  [NotificationType.LOCAL]: validateLocal,
};

export default verifyConfigBasedOnNotificationType;
