import nodemailer from 'nodemailer';

import { NotifierService } from './notifier-service.js';
import logger from '../common/logger.js';

import type { EmailConfig } from '../common/config/index.js';
import type { NotificationReason } from '../interfaces/notification-reason.js';

export class EmailNotifier extends NotifierService {
  private readonly emailTransporter: nodemailer.Transporter;

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

  async sendNotification(account: string, reason: NotificationReason, url: string): Promise<void> {
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
        'Email sent.',
      );
    } catch (err) {
      L.error({ emailConfig: this.config }, 'Error sending email. Please check your configuration');
      throw err;
    }
  }
}
