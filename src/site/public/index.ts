/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios';
import { getInitData } from './talon-harness';

const params = new URLSearchParams(document.location.search);
const id = params.get('id');
console.info('id:', id);

const apiRoot = `${window.location.origin}`;

let gInitData: Record<string, any>;
let gSession: SessionData;

interface SessionData {
  site_key: string;
  timing: Record<string, any>[];
  session: Record<string, any>;
}

async function sendInit(initData: Record<string, any>): Promise<SessionData> {
  const postPath = `${apiRoot}/init`;
  const resp = await axios.post<SessionData>(postPath, initData);
  return resp.data;
}

async function sendExecute(session: SessionData): Promise<void> {
  const postPath = `${apiRoot}/execute`;
  await axios.post(postPath, session);
}

interface CompleteBody {
  hCaptchaKey: string;
  session: Record<string, any>;
  initData: Record<string, any>;
  id: string;
}
async function sendComplete(completeBody: CompleteBody): Promise<void> {
  const postPath = `${apiRoot}/complete`;
  await axios.post(postPath, completeBody);
  console.log('Successfully sent Captcha token');
  document.getElementById('success-text')!.hidden = false;
}

async function captchaSuccess(captchaResponse: string): Promise<void> {
  console.log('captchaResponse', captchaResponse);
  await sendComplete({
    hCaptchaKey: captchaResponse,
    id: id || '',
    initData: gInitData,
    session: gSession.session,
  });
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

  gInitData = getInitData();
  gSession = await sendInit(gInitData);

  const widgetID = hcaptcha.render('hcaptcha', {
    sitekey: gSession.site_key,
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

  hcaptcha.execute(widgetID);
  await sendExecute(gSession);
}

global.hCaptchaLoaded = hCaptchaLoaded;
