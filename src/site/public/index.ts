/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from 'axios';
import { getInitData } from './talon-harness';

const params = new URLSearchParams(document.location.search);
const id = params.get('id');
const pkey = params.get('pkey');
const blob = params.get('blob') || undefined;

console.info('id:', id);
console.info('pkey:', pkey);
console.info('blob:', blob);

const apiRoot = `${window.location.origin}`;

// =========
// hCaptcha
// =========

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

function errorMessage(err: any): void {
  console.error(err);
  const e: AxiosError<string> = err;
  const message: string = e.response?.data || err.message || 'Unknown error occured';
  const errorDiv = document.getElementById('error-text') as HTMLDivElement;
  errorDiv.innerText = message;
  errorDiv.hidden = false;
}

async function captchaSuccess(captchaResult: string): Promise<void> {
  console.log('captchaResponse', captchaResult);
  try {
    await sendComplete({
      id: id as string,
      captchaResult,
      session: gSession,
      initData: gInitData,
      timing: gTiming,
    });
  } catch (err) {
    errorMessage(err);
  }
  console.log('Successfully sent Captcha token');
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.getElementById('success-text')!.hidden = false;
}

async function hCaptchaLoaded(): Promise<void> {
  try {
    if (!pkey) {
      console.log('loading hCaptcha');
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
  } catch (err) {
    errorMessage(err);
  }
}
global.hCaptchaLoaded = hCaptchaLoaded;

// =========
// Arkose
// =========

// Guide: https://arkoselabs.atlassian.net/wiki/spaces/DG/pages/497713605/Single+Page+Application+Guide
interface ArkoseCompleteEvent {
  token: string;
}

interface ArkoseConfig {
  onCompleted(t: ArkoseCompleteEvent): void;
  onReady(): void;
  data: { blob?: string };
}

interface Arkose {
  run: () => void;
  setConfig: (config: ArkoseConfig) => void;
}

let Arkose: Arkose;
let success = false;
let arkoseLoaded = false;

function setupArkoseEnforcement(enforcement: Arkose): void {
  console.log(enforcement);
  Arkose = enforcement;
  console.log('Creating Arkose captcha');

  Arkose.setConfig({
    async onCompleted(t: ArkoseCompleteEvent) {
      console.log('Captcha sessionData:', t);
      const postPath = `${apiRoot}/arkose`;
      const body = {
        sessionData: t.token,
        id,
      };
      await axios.post(postPath, body);
      console.log('Successfully sent Captcha token');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      document.getElementById('success-text')!.hidden = false;
      success = true;
    },
    onReady() {
      console.log('ready');
      arkoseLoaded = true;
      if (!success) Arkose.run();
    },
    data: { blob },
  });

  console.log('arkoseLoaded', arkoseLoaded);
  if (!success && arkoseLoaded) Arkose.run();
}
global.setupArkoseEnforcement = setupArkoseEnforcement;

function createArkoseScript(): void {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `https://client-api.arkoselabs.com/v2/${pkey}/api.js`;
  script.setAttribute('data-callback', 'setupArkoseEnforcement');
  script.async = true;
  script.defer = true;
  script.id = 'arkosescript';

  document.head.append(script);
}

window.addEventListener('load', () => {
  if (pkey) {
    console.log('loading Arkose Captcha');
    createArkoseScript();
  }
});
