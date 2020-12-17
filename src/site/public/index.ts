/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as talon from './talon-sdk';

const params = new URLSearchParams(document.location.search);
const pkey = params.get('pkey') || '91e4137f-95af-4bc9-97af-cdcedce21c8c';
const id = params.get('id');
const blob = params.get('blob');
console.info('pkey:', pkey);
console.info('id:', id);
console.info('blob:', blob);

let success = false;

async function sendCaptchaToken(token: string): Promise<void> {
  const postPath = `${window.location.pathname}/solve`.replace(/\/+/g, '/');
  const resp = await fetch(postPath, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionData: token,
      id,
    }),
  });
  if (resp.ok) {
    console.log('Successfully sent Captcha token');
    document.getElementById('success-text')!.hidden = false;
    success = true;
  } else console.error('Failed sending Captcha token');
}

function captchaSuccess(captchaResponse: string): void {
  console.log('captchaResponse', captchaResponse);
  sendCaptchaToken(captchaResponse);
}

function expiredCallback(): void {
  console.log('expired');
}

function errorCallback(error: string): void {
  console.error('hCaptcha error -', error);
}

async function expiredClosedCallback(): Promise<void> {
  console.log('expiredClosedCallback');
}

async function openCallback(): Promise<void> {
  console.log('openCallback');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function hCaptchaLoaded(): Promise<void> {
  console.log('hCaptcha is ready');

  await talon.sdkInit();
  const clientIp = await talon.initIp();
  const session = await talon.initTalon(clientIp);
  let timing = await talon.sdkInitComplete(session);

  const widgetID = hcaptcha.render('hcaptcha', {
    sitekey: session.session.plan.h_captcha.site_key,
    theme: 'dark',
    callback: captchaSuccess,
    'expire-callback': expiredCallback,
    'expired-callback': expiredCallback,
    'chalexpired-callback': expiredClosedCallback,
    'close-callback': expiredClosedCallback,
    'error-callback': errorCallback,
    'open-callback': openCallback,
    size: 'invisible',
    'challenge-container': 'challenge_container_hcaptcha',
  });
  console.log('widgetID', widgetID);

  timing = await talon.challengeReady(session, timing);
  hcaptcha.execute(widgetID);
  await talon.challengeExecute(session, timing);
}

global.hCaptchaLoaded = hCaptchaLoaded;

window.addEventListener('load', () => {
  console.log('loaded');
});
