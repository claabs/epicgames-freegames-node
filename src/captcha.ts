/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SpeechClient } from '@google-cloud/speech';
import rawAxios from 'axios';
import { google } from '@google-cloud/speech/build/protos/protos';
import qs from 'qs';
import { JSDOM } from 'jsdom';
import { encode as encodeArrayBuffer } from 'base64-arraybuffer';
import readline from 'readline';
import open from 'open';

export enum EpicArkosePublicKey {
  LOGIN = '37D033EB-6489-3763-2AE1-A228C04103F5',
  CREATE = 'E8AD0E2A-2E72-0F06-2C52-706D88BECA75',
}

const ARKOSE_BASE_URL = 'https://epic-games-api.arkoselabs.com';

const axios = rawAxios.create({
  headers: {
    'accept-language': 'en-US,en',
  },
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
  const gcpConfigName = process.env.GCP_CONFIG_NAME || 'missing-gcp-config';
  const speech = new SpeechClient({
    keyFilename: `./config/${gcpConfigName}`,
  });
  const CAPTCHA_URL = `${ARKOSE_BASE_URL}/fc/api/nojs/?pkey=${publicKey}&gametype=audio`;

  const initialPage = await axios.get<string>(CAPTCHA_URL);
  const initialDocument = new JSDOM(initialPage.data).window.document;
  const sessionToken = (initialDocument.querySelector(
    '#fc-nojs-form > div.audioCtn > form > input[name="fc-game[session_token]"]'
  ) as HTMLInputElement).value;
  const data = (initialDocument.querySelector(
    '#fc-nojs-form > div.audioCtn > form > input[name="fc-game[data]"]'
  ) as HTMLInputElement).value;
  const audioPath = (initialDocument.querySelector('#audio_download') as HTMLAnchorElement).href;
  const audioURL = ARKOSE_BASE_URL + audioPath;

  console.debug('audio URL', audioURL);

  const audioResp = await axios.get<ArrayBuffer>(audioURL, {
    responseType: 'arraybuffer',
  });

  const request: google.cloud.speech.v1.IRecognizeRequest = {
    audio: {
      content: encodeArrayBuffer(audioResp.data),
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

  const [speechResponse] = await speech.recognize(request);

  let digitString;
  if (
    speechResponse.results &&
    speechResponse.results[0].alternatives &&
    speechResponse.results[0].alternatives[0].transcript
  ) {
    digitString = speechResponse.results[0].alternatives[0].transcript;
  } else {
    console.log('Transcript failed. Retrying.');
    return getCaptchaSessionToken(publicKey);
  }

  digitString = digitString.replace(/\D/g, '');
  if (digitString.length !== 7) {
    console.log('Did not transcribe enough digits. Retrying');
    return getCaptchaSessionToken(publicKey);
  }

  console.debug('Guessing', digitString);

  const submitBody = {
    'fc-game[session_token]': sessionToken,
    'fc-game[data]': data,
    'fc-game[audio_type]': 2,
    'fc-game[audio_guess]': digitString,
  };

  const submitResp = await axios.post<string>(CAPTCHA_URL, qs.stringify(submitBody), {
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  });
  const submitDocument = new JSDOM(submitResp.data).window.document;
  const verificationText = submitDocument.querySelector('#verification-txt > span');
  const errorMsg = submitDocument.querySelector('#error-msg');

  if (verificationText && verificationText.innerHTML === 'Verification correct!') {
    console.log('Captcha successful');
    const verificationCode = (submitDocument.querySelector(
      '#verification-code'
    ) as HTMLInputElement).value;
    console.log('Captcha session token:', verificationCode);
    return verificationCode;
  }
  if (errorMsg && errorMsg.innerHTML.includes('Audio challenge methods require some extra steps')) {
    return manuallySolveCaptcha(publicKey);
  }
  if (errorMsg && errorMsg.innerHTML.includes(`Whoops! That's not quite right.`)) {
    console.warn('Got captcha incorrect');
    return getCaptchaSessionToken(publicKey);
  }
  console.error('Unexpected error in captcha', submitResp.data);
  throw new Error('Error solving captcha');
}
