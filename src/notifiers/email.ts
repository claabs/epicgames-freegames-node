import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import logger from '../common/logger';
import config from '../config';
import NotifierService from '../models/NotifierService';
import { EmailConfig } from '../models/NotificationsConfig';
import { NotificationType } from '../models/NotificationsType';
import NotificationReason from '../models/NotificationReason';

class EmailNotifier implements NotifierService {
  private readonly isActive: boolean = false;

  private readonly emailConfig!: EmailConfig;

  private readonly emailTransporter!: Mail;

  constructor() {
    const emailConfig = config.notificationConfig.getConfig(NotificationType.EMAIL);
    if (!emailConfig) {
      return;
    }
    this.isActive = true;

    this.emailConfig = emailConfig;
    this.emailTransporter = nodemailer.createTransport({
      host: this.emailConfig.smtpHost,
      port: this.emailConfig.smtpPort,
      secure: this.emailConfig.secure,
      auth: this.emailConfig.auth,
    });
  }

  async sendNotification(url: string, account: string, reason: NotificationReason): Promise<void> {
    if (!this.isActive) {
      throw new Error(`Tried to call sendNotification of inactive notifier`);
    }

    const L = logger.child({ user: account, reason });
    L.trace('Sending email');

    try {
      await this.emailTransporter.sendMail({
        from: {
          address: this.emailConfig.emailSenderAddress,
          name: this.emailConfig.emailSenderName,
        },
        to: this.emailConfig.emailRecipientAddress,
        subject: `Epic Games free games needs a Captcha solved`,
        html: `<p><b>epicgames-freegames-node</b>, reason: ${reason}, account: ${account}.</p>
             <p>Open this page and solve the captcha: <a href="${url}">${url}</a></p>`,
        textEncoding: 'base64', // Some email clients don't like the '=' in the URL when using quoted-printable?
      });
      L.debug(
        {
          from: this.emailConfig.emailSenderAddress,
          to: this.emailConfig.emailRecipientAddress,
        },
        'Email sent.'
      );
    } catch (err) {
      L.error(
        { emailConfig: this.emailConfig },
        'Error sending email. Please check your configuration'
      );
      throw err;
    }
  }
}

const emailNotifier = new EmailNotifier();

export default emailNotifier;
