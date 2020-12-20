/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getInitData } from './talon-harness';

const params = new URLSearchParams(document.location.search);
const id = params.get('id');
console.info('id:', id);

const apiRoot = `${window.location.origin}`;

let gSession: Record<string, any> = {};
let gInitData: Record<string, any> = {};
let gTiming: Record<string, any>[] = [];

interface InitResp {
  sitekey: string;
  session: Record<string, any>;
  timing: Record<string, any>[];
}
async function sendInit(initData: Record<string, any>): Promise<InitResp> {
  const postPath = `${apiRoot}/init`;
  const resp = await axios.post<InitResp>(postPath, { initData, id });
  return resp.data;
}

interface CompleteBody {
  id: string;
  captchaResult: string;
  session: Record<string, any>;
  initData: Record<string, any>;
  timing: Record<string, any>[];
}
async function sendComplete(completeBody: CompleteBody): Promise<void> {
  const postPath = `${apiRoot}/complete`;
  await axios.post(postPath, completeBody);
}

async function captchaSuccess(captchaResult: string): Promise<void> {
  console.log('captchaResponse', captchaResult);
  await sendComplete({
    id: id as string,
    captchaResult,
    session: gSession,
    initData: gInitData,
    timing: gTiming,
  });
  console.log('Successfully sent Captcha token');
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.getElementById('success-text')!.hidden = false;
}

async function hCaptchaLoaded(): Promise<void> {
  console.log('hCaptcha is ready');

  gInitData = getInitData();
  const initResp = await sendInit(gInitData);
  const { sitekey } = initResp;
  gSession = initResp.session;
  gTiming = initResp.timing;

  const widgetID = hcaptcha.render('hcaptcha', {
    endpoint: `${apiRoot}/proxy`,
    sitekey,
    theme: 'dark',
    size: 'invisible',
    callback: captchaSuccess,
    'challenge-container': 'challenge_container_hcaptcha',
  });
  hcaptcha.execute(widgetID);
}

global.hCaptchaLoaded = hCaptchaLoaded;
