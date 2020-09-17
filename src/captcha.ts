import open from 'open';
import { v4 as uuid } from 'uuid';
import querystring from 'querystring';
import EventEmitter from 'events';
import nodemailer from 'nodemailer';
import L from './common/logger';
import { config } from './common/config';

export enum EpicArkosePublicKey {
  LOGIN = '37D033EB-6489-3763-2AE1-A228C04103F5',
  CREATE = 'E8AD0E2A-2E72-0F06-2C52-706D88BECA75',
  PURCHASE = 'B73BD16E-3C8E-9082-F9C7-FA780FF2E68B',
}

export interface CaptchaSolution {
  id: string;
  sessionData: string;
}

let pendingCaptchas: string[] = [];

const captchaEmitter = new EventEmitter();

const emailTransporter = nodemailer.createTransport({
  host: config.email.smtpHost,
  port: config.email.smtpPort,
  secure: config.email.secure,
  auth: config.email.auth,
});

async function sendEmail(url: string, publicKey: EpicArkosePublicKey): Promise<void> {
  const catpchaReason = {
    [EpicArkosePublicKey.LOGIN]: 'login',
    [EpicArkosePublicKey.CREATE]: 'create an account',
    [EpicArkosePublicKey.PURCHASE]: 'make a purchase',
  };

  L.trace('Sending email');
  try {
    await emailTransporter.sendMail({
      from: {
        address: config.email.emailSenderAddress,
        name: config.email.emailSenderName,
      },
      to: config.email.emailRecipientAddress,
      subject: 'Epic Games free games needs a Captcha solved',
      html: `<p><b>epicgames-freegames-node</b> needs a captcha solved in order to ${catpchaReason[publicKey]}.</p>
             <p>Open this page and solve the captcha: <a href="${url}">${url}</a></p>`,
    });
    L.debug(
      {
        from: config.email.emailSenderAddress,
        to: config.email.emailRecipientAddress,
      },
      'Email sent.'
    );
  } catch (err) {
    L.error({ emailConfig: config.email }, 'Error sending email. Please check your configuration');
    throw err;
  }
}

const solveLocally = async (url: string): Promise<void> => {
  await open(url);
};

export async function notifyManualCaptcha(publicKey: EpicArkosePublicKey): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = uuid();
    pendingCaptchas.push(id);
    const qs = querystring.stringify({
      id,
      pkey: publicKey,
    });
    const url = `${config.baseUrl}?${qs}`;
    L.debug(`Go to ${url} and solve the captcha`);

    const solveStep = process.env.ENV === 'local' ? solveLocally : sendEmail;

    solveStep(url, publicKey)
      .then(() => {
        L.info({ id }, 'Action requested. Waiting for Captcha to be solved');
        captchaEmitter.on('solved', (captcha: CaptchaSolution) => {
          if (captcha.id === id) resolve(captcha.sessionData);
        });
      })
      .catch(err => {
        L.error(err);
        reject(err);
      });
  });
}

export async function responseManualCaptcha(captchaSolution: CaptchaSolution): Promise<void> {
  if (pendingCaptchas.includes(captchaSolution.id)) {
    pendingCaptchas = pendingCaptchas.filter(e => e !== captchaSolution.id);
    captchaEmitter.emit('solved', captchaSolution);
  } else {
    L.error(`Could not find captcha id: ${captchaSolution.id}`);
  }
}
