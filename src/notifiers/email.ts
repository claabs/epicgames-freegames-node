import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import logger from '../common/logger';
import config from '../config';
import NotifierService from '../models/NotifierService';

class EmailNotifier implements NotifierService {
  emailTransporter: Mail;

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.secure,
      auth: config.email.auth,
    });
  }

  async sendNotification(url: string, account: string): Promise<void> {
    const L = logger.child({ user: account });
    L.trace('Sending email');

    try {
      await this.emailTransporter.sendMail({
        from: {
          address: config.email.emailSenderAddress,
          name: config.email.emailSenderName,
        },
        to: config.email.emailRecipientAddress,
        subject: `Epic Games free games needs a Captcha solved for ${account}`,
        html: `<p><b>epicgames-freegames-node</b> needs a captcha solved.</p>
             <p>Open this page and solve the captcha: <a href="${url}">${url}</a></p>`,
        textEncoding: 'base64', // Some email clients don't like the '=' in the URL when using quoted-printable?
      });
      L.debug(
        {
          from: config.email.emailSenderAddress,
          to: config.email.emailRecipientAddress,
        },
        'Email sent.'
      );
    } catch (err) {
      L.error(
        { emailConfig: config.email },
        'Error sending email. Please check your configuration'
      );
      throw err;
    }
  }
}

const emailNotifier = new EmailNotifier();

export default emailNotifier;
