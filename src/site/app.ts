/* eslint-disable @typescript-eslint/camelcase */
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import { URL } from 'url';
import proxy from 'express-http-proxy';
import nocache from 'nocache';
import got from 'got';
import asyncHandler from 'express-async-handler';
import L from '../common/logger';
import { config } from '../common/config';
import { getPendingCaptcha, responseManualCaptcha } from '../captcha';
import TalonSdk, { assembleFinalCaptchaKey, InitData, PhaserSession, Timing } from './talon-sdk';

const baseUrl = new URL(config.baseUrl);
const basePath = baseUrl.pathname;

const app = express();

const router = express.Router();

router.use(
  '/proxy',
  proxy('https://hcaptcha.com', {
    proxyReqPathResolver: req => {
      let { url } = req;
      if (url.includes(baseUrl.hostname)) {
        L.trace(url, 'replacing url component');
        url = url.replace(new RegExp(baseUrl.hostname, 'g'), 'talon-website-prod.ak.epicgames.com');
        L.trace({ url }, 'updated url');
      }
      return url;
    },
  })
);
router.use('/assets', proxy('https://assets.hcaptcha.com'));
router.use(express.static(path.join(__dirname, 'public')));
router.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get(
  '/hcaptcha-api.js',
  asyncHandler(async (req, res) => {
    L.trace('incoming /hcaptcha-api request');
    const resp = await got.get(
      `https://hcaptcha.com/1/api.js?onload=hCaptchaLoaded&render=explicit`,
      {
        followRedirect: true,
        responseType: 'text',
      }
    );
    const body = resp.body
      .replace(new RegExp('https://assets.hcaptcha.com', 'g'), `${baseUrl.origin}/assets`)
      .replace('(hcaptcha|1\\/api)', 'hcaptcha-api');
    res.header('content-type', resp.headers['content-type']);
    res.status(200).send(body);
  })
);

interface InitResp {
  initData: InitData;
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, InitResp, any>(
  '/init',
  asyncHandler(async (req, res) => {
    if (!req.headers?.['user-agent']) {
      res.status(400).send('user-agent header required');
      return;
    }
    L.trace({ body: req.body }, 'incoming /init POST body');
    const { initData, id } = req.body;
    const { email } = getPendingCaptcha(id);
    const talon = new TalonSdk(email, req.headers['user-agent']);
    const talonSessionResp = await talon.beingTalonSession(initData);
    let { session } = talonSessionResp;
    const { timing } = talonSessionResp;
    while (!session.session.plan.h_captcha?.site_key) {
      // Epic still returns Arkose some of the time
      // eslint-disable-next-line no-await-in-loop
      session = (await talon.beingTalonSession(initData)).session;
    }
    res.status(200).send({ sitekey: session.session.plan.h_captcha.site_key, timing, session });
  })
);

interface CompleteBody {
  id: string;
  captchaResult: string;
  session: PhaserSession;
  initData: InitData;
  timing: Timing[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, CompleteBody, any>(
  '/complete',
  asyncHandler(async (req, res) => {
    if (!req.headers?.['user-agent']) {
      res.status(400).send('user-agent header required');
      return;
    }
    L.trace({ body: req.body }, 'incoming /complete POST body');
    const { id, captchaResult, initData, session, timing } = req.body;
    const { email } = getPendingCaptcha(id);
    const talon = new TalonSdk(email, req.headers['user-agent']);
    await talon.challengeComplete(session, timing);
    const sessionData = assembleFinalCaptchaKey(session, initData, captchaResult);
    await responseManualCaptcha({ id, sessionData });
    res.status(200).send();
  })
);

interface ArkoseBody {
  sessionData: string;
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, ArkoseBody, any>(
  '/arkose',
  asyncHandler(async (req, res) => {
    L.trace({ body: req.body }, 'incoming /arkose POST body');
    const { id, sessionData } = req.body;
    await responseManualCaptcha({ id, sessionData });
    res.status(200).send();
  })
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err: Error, req, res, next) => {
  L.error(err);
  res.status(500).send(err.message);
};

router.use(errorHandler);

app.use(nocache());
app.disable('etag');

app.use(basePath, router);

app.listen(config.serverPort);
