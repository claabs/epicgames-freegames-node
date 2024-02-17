import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import logger from '../common/logger';
import { NotifierService } from './notifier-service';
import { NotificationFields } from '../interfaces/notification';
import { EmailConfig } from '../common/config';

export class EmailNotifier extends NotifierService {
  private readonly emailTransporter: Mail;

  private config: EmailConfig;

  constructor(config: EmailConfig) {
    super();

    this.config = config;

    this.emailTransporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.secure,
      auth: this.config.auth,
    });
  }

  async sendNotification(fields: NotificationFields): Promise<void> {
    const { account, reason, url } = fields;
    const L = logger.child({ user: account, reason });
    L.trace('Sending email');

    try {
      await this.emailTransporter.sendMail({
        from: {
          address: this.config.emailSenderAddress,
          name: this.config.emailSenderName,
        },
        to: this.config.emailRecipientAddress,
        subject: `Epic Games free games needs an action performed`,
        html: `<p><b>epicgames-freegames-node</b>, reason: ${reason}, account: ${account}.</p>
             <p>Link: <a href="${url}">${url}</a></p>`,
        textEncoding: 'base64', // Some email clients don't like the '=' in the URL when using quoted-printable?
      });
      L.debug(
        {
          from: this.config.emailSenderAddress,
          to: this.config.emailRecipientAddress,
        },
        'Email sent.'
      );
    } catch (err) {
      L.error({ emailConfig: this.config }, 'Error sending email. Please check your configuration');
      throw err;
    }
  }
}
