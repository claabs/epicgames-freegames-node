import nodemailer from 'nodemailer';

import { NotifierService } from './notifier-service.ts';
import logger from '../common/logger.ts';

import type { Transporter } from 'nodemailer';
import type z from 'zod';

import type { emailConfigSchema } from '../common/config/index.ts';
import type { NotificationReason } from '../notify.ts';

export class EmailNotifier extends NotifierService {
  private readonly emailTransporter: Transporter;

  private config: z.infer<typeof emailConfigSchema>;

  constructor(config: z.infer<typeof emailConfigSchema>) {
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
    } catch (error) {
      L.error({ emailConfig: this.config }, 'Error sending email. Please check your configuration');
      throw error;
    }
  }
}
