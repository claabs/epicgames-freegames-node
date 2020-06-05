import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';
import { JSDOM } from 'jsdom';
import readline from 'readline';
import open from 'open';
import acctRequest from './common/request';
import L from './common/logger';
import { ARKOSE_BASE_URL } from './common/constants';
import { config } from './common/config';

export enum EpicArkosePublicKey {
  LOGIN = '37D033EB-6489-3763-2AE1-A228C04103F5',
  CREATE = 'E8AD0E2A-2E72-0F06-2C52-706D88BECA75',
  PURCHASE = 'B73BD16E-3C8E-9082-F9C7-FA780FF2E68B',
}

const request = acctRequest.client.extend({
  headers: {
    'accept-language': 'en-US,en',
  },
  responseType: 'text',
});

async function asyncReadline(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question}:\n`, (answer: string) => {
      rl.close();
      resolve(answer);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rl.on('error', (err: any) => {
      reject(err);
    });
  });
}

const manuallySolveCaptcha = async (publicKey: EpicArkosePublicKey): Promise<string> => {
  if (!process.env.ENV || process.env.ENV !== 'local') {
    throw new Error('Audio captcha cannot be solved by a bot');
  }
  await open(`${ARKOSE_BASE_URL}/fc/api/nojs/?pkey=${publicKey}`);
  const token = await asyncReadline(
    'Solve the captcha, paste in the session token, and press enter'
  );
  return token;
};

export async function getCaptchaSessionToken(publicKey: EpicArkosePublicKey): Promise<string> {
  if (publicKey === EpicArkosePublicKey.CREATE) return manuallySolveCaptcha(publicKey);
  const { gcpConfigName } = config;
  if (!gcpConfigName)
    throw new Error('Google Cloud Platform configuration required to bypass captcha');
  const speech = new SpeechClient({
    keyFilename: `./config/${gcpConfigName}`,
  });
  const CAPTCHA_URL = `${ARKOSE_BASE_URL}/fc/api/nojs/?pkey=${publicKey}&gametype=audio`;

  L.trace({ url: CAPTCHA_URL }, 'Requesting initial captcha page');
  const initialPage = await request.get<string>(CAPTCHA_URL);
  const initialDocument = new JSDOM(initialPage.body).window.document;
  const sessionToken = (initialDocument.querySelector(
    '#fc-nojs-form > div.audioCtn > form > input[name="fc-game[session_token]"]'
  ) as HTMLInputElement).value;
  const data = (initialDocument.querySelector(
    '#fc-nojs-form > div.audioCtn > form > input[name="fc-game[data]"]'
  ) as HTMLInputElement).value;
  const audioPath = (initialDocument.querySelector('#audio_download') as HTMLAnchorElement).href;
  const audioURL = ARKOSE_BASE_URL + audioPath;

  L.trace({ url: audioURL }, 'Requesting audio file');
  const audioResp = await request.get(audioURL, {
    responseType: 'buffer',
  });

  const speechRequest: google.cloud.speech.v1.IRecognizeRequest = {
    audio: {
      content: Buffer.from(audioResp.body).toString('base64'),
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 8000,
      languageCode: 'en-US',
      speechContexts: [
        {
          phrases: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        },
      ],
    },
  };

  const [speechResponse] = await speech.recognize(speechRequest);

  let digitString;
  if (
    speechResponse.results &&
    speechResponse.results[0].alternatives &&
    speechResponse.results[0].alternatives[0].transcript
  ) {
    digitString = speechResponse.results[0].alternatives[0].transcript;
  } else {
    L.debug({ speechResponse }, 'Transcript failed. Retrying.');
    return getCaptchaSessionToken(publicKey);
  }

  digitString = digitString.replace(/\D/g, '');
  if (digitString.length !== 7) {
    L.debug('Did not transcribe enough digits. Retrying');
    return getCaptchaSessionToken(publicKey);
  }

  L.debug({ digitString }, 'Guessing captcha');

  const submitBody = {
    'fc-game[session_token]': sessionToken,
    'fc-game[data]': data,
    'fc-game[audio_type]': 2,
    'fc-game[audio_guess]': digitString,
  };

  L.trace({ form: submitBody, url: CAPTCHA_URL }, 'Captcha POST request');
  const submitResp = await request.post<string>(CAPTCHA_URL, {
    form: submitBody,
  });
  const submitDocument = new JSDOM(submitResp.body).window.document;
  const verificationText = submitDocument.querySelector('#verification-txt > span');
  const errorMsg = submitDocument.querySelector('#error-msg');

  if (verificationText && verificationText.innerHTML === 'Verification correct!') {
    L.info('Captcha solved successfully');
    const verificationCode = (submitDocument.querySelector(
      '#verification-code'
    ) as HTMLInputElement).value;
    L.debug({ verificationCode }, 'Captcha session token');
    return verificationCode;
  }
  if (errorMsg && errorMsg.innerHTML.includes('Audio challenge methods require some extra steps')) {
    L.debug('Restricted audio challenge');
    return manuallySolveCaptcha(publicKey);
  }
  if (errorMsg && errorMsg.innerHTML.includes(`Whoops! That's not quite right.`)) {
    L.debug('Got captcha incorrect');
    return getCaptchaSessionToken(publicKey);
  }
  if (submitResp.body && submitResp.body.includes('Reloading')) {
    L.debug('Reloading...');
    return getCaptchaSessionToken(publicKey);
  }
  L.error({ error: submitResp.body }, 'Unexpected error in captcha');
  throw new Error('Error solving captcha');
}
