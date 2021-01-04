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
// Talon
// =========

let gSession: Record<string, any> = {};
let gInitData: Record<string, any> = {};
let gTiming: Record<string, any>[] = [];
let gCaptchaKey: string;
let gBlob: string | undefined;

interface InitResp {
  captchaKey: string;
  provider: 'h_captcha' | 'arkose';
  blob?: string;
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

async function talonSuccess(captchaResult: string): Promise<void> {
  console.log('talon captchaResult:', captchaResult);
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

// =========
// hCaptcha
// =========

async function hcaptchaSuccess(captchaResult: string): Promise<void> {
  console.log('hcaptcha captchaResult', captchaResult);
  talonSuccess(captchaResult);
}

async function hCaptchaLoaded(): Promise<void> {
  try {
    console.log('loaded hCaptcha');
    const widgetID = hcaptcha.render('hcaptcha', {
      endpoint: `${apiRoot}/proxy`,
      sitekey: gCaptchaKey,
      theme: 'dark',
      size: 'invisible',
      callback: hcaptchaSuccess,
      'challenge-container': 'challenge_container_hcaptcha',
    });
    hcaptcha.execute(widgetID);
  } catch (err) {
    errorMessage(err);
  }
}
global.hCaptchaLoaded = hCaptchaLoaded;

function createHcaptchaScript(): void {
  console.log('Creating hCaptcha captcha script');
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/hcaptcha-api.js?onload=hCaptchaLoaded&render=explicit';
  script.async = true;
  script.defer = true;
  script.id = 'hcaptchascript';

  document.head.append(script);
}

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
      console.log('arkose captchaResult', t);
      if (!pkey) {
        // Talon flow
        talonSuccess(t.token);
      } else {
        // Explicit Arkose flow
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
      }
    },
    onReady() {
      console.log('ready');
      arkoseLoaded = true;
      if (!success) Arkose.run();
    },
    data: { blob: gBlob || blob },
  });

  console.log('arkoseLoaded', arkoseLoaded);
  if (!success && arkoseLoaded) Arkose.run();
}
global.setupArkoseEnforcement = setupArkoseEnforcement;

function createArkoseScript(captchaKey: string): void {
  console.log('Creating Arkose captcha script');
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `https://client-api.arkoselabs.com/v2/${captchaKey}/api.js`;
  script.setAttribute('data-callback', 'setupArkoseEnforcement');
  script.async = true;
  script.defer = true;
  script.id = 'arkosescript';

  document.head.append(script);
}

// =========
// Both
// =========

window.addEventListener('load', async () => {
  if (pkey) {
    console.log('Performing explicit Arkose captcha. Loading Arkose captcha...');
    createArkoseScript(pkey);
  } else {
    console.log('Performing Talon captcha. Getting session...');
    try {
      gInitData = getInitData();
      const initResp = await sendInit(gInitData);
      const { provider } = initResp;
      gCaptchaKey = initResp.captchaKey;
      gSession = initResp.session;
      gTiming = initResp.timing;
      gBlob = initResp.blob;
      console.log('captchaKey:', gCaptchaKey);
      console.log('session:', gSession);
      console.log('timing:', gTiming);
      if (provider === 'arkose') {
        createArkoseScript(gCaptchaKey);
      } else if (provider === 'h_captcha') {
        createHcaptchaScript();
      } else {
        console.error('Unrecognized captcha provider');
      }
    } catch (err) {
      errorMessage(err);
    }
  }
});
