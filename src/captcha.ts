import { v4 as uuid } from 'uuid';
import querystring from 'qs';
import EventEmitter from 'events';
import logger from './common/logger';
import { config, NotificationType } from './common/config';
import localNotifier from './notifications/local';
import emailNotifier from './notifications/email';
import NotificationService from './notifications';
import telegramNotifier from './notifications/telegram';

export enum EpicArkosePublicKey {
  LOGIN = '37D033EB-6489-3763-2AE1-A228C04103F5',
  CREATE = 'E8AD0E2A-2E72-0F06-2C52-706D88BECA75',
  PURCHASE = 'B73BD16E-3C8E-9082-F9C7-FA780FF2E68B',
}

export interface CaptchaSolution {
  id: string;
  sessionData: string;
}

export interface PendingCaptcha {
  id: string;
  email: string;
  xsrfToken: string;
}

let pendingCaptchas: PendingCaptcha[] = [];

const captchaEmitter = new EventEmitter();

const notifiers: Record<NotificationType, NotificationService> = {
  [NotificationType.EMAIL]: emailNotifier,
  [NotificationType.TELEGRAM]: telegramNotifier,
};

function getNotifier(): NotificationService {
  if (process.env.ENV === 'local') {
    return localNotifier;
  }
  return notifiers[config.notificationType];
}

export async function notifyManualCaptcha(
  email: string,
  xsrfToken: string,
  publicKey?: EpicArkosePublicKey,
  blob?: string
): Promise<string> {
  const L = logger.child({ user: email });
  const id = uuid();

  pendingCaptchas.push({ id, email, xsrfToken });

  const qs = querystring.stringify({ id, pkey: publicKey, blob });
  const url = `${config.baseUrl}?${qs}`;
  L.debug(`Go to ${url} and solve the captcha`);

  return new Promise((resolve, reject) => {
    getNotifier()
      .sendNotification(url, email)
      .then(() => {
        L.info({ id, url }, 'Action requested. Waiting for Captcha to be solved');
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
  if (pendingCaptchas.find(pending => pending.id === captchaSolution.id)) {
    pendingCaptchas = pendingCaptchas.filter(pending => pending.id !== captchaSolution.id);
    captchaEmitter.emit('solved', captchaSolution);
  } else {
    logger.error(`Could not find captcha id: ${captchaSolution.id}`);
  }
}

export function getPendingCaptcha(id: string): PendingCaptcha {
  const retCaptcha = pendingCaptchas.find(pending => pending.id === id);
  if (!retCaptcha) throw new Error(`Could not find captcha id: ${id}`);
  return retCaptcha;
}
