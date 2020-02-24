/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SpeechClient } from '@google-cloud/speech';
import rawAxios from 'axios';
import { google } from '@google-cloud/speech/build/protos/protos';
import * as qs from 'qs';
import { JSDOM } from 'jsdom';
import { encode as encodeArrayBuffer } from 'base64-arraybuffer';

const ARKOSE_BASE_URL = 'https://epic-games-api.arkoselabs.com';
const CAPTCHA_URL = `${ARKOSE_BASE_URL}/fc/api/nojs/?pkey=37D033EB-6489-3763-2AE1-A228C04103F5&gametype=audio`;

const axios = rawAxios.create({
  headers: {
    'accept-language': 'en-US,en',
  },
});

export async function getCaptchaSessionToken(): Promise<string> {
  const speech = new SpeechClient({
    keyFilename: './config/captcha-audio-720f15c34d3e.json',
  });

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
    return getCaptchaSessionToken();
  }

  digitString = digitString.replace(/\D/g, '');

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

  if (verificationText && verificationText.innerHTML === 'Verification correct!') {
    console.log('Captcha successful');
    const verificationCode = (submitDocument.querySelector(
      '#verification-code'
    ) as HTMLInputElement).value;
    console.log('Captcha session token:', verificationCode);
    return verificationCode;
  }
  console.warn('Captcha failed. Trying again');
  return getCaptchaSessionToken();
}
