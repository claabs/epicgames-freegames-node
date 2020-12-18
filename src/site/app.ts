/* eslint-disable @typescript-eslint/camelcase */
import express from 'express';
import path from 'path';
import { URL } from 'url';
import L from '../common/logger';
import { config } from '../common/config';
import { responseManualCaptcha } from '../captcha';
import * as talon from './talon-sdk';

const app = express();

const router = express.Router();

router.use(express.static(path.join(__dirname, 'public')));
router.use(express.json());

interface SessionData {
  site_key: string;
  timing: talon.Timing[];
  session: talon.PhaserSession;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, talon.InitData, any>('/init', async (req, res) => {
  L.debug({ body: req.body }, 'incoming /init POST body');
  const initData: talon.InitData = req.body;
  await talon.sdkInit();
  const clientIp = await talon.initIp();
  const session = await talon.initTalon(clientIp, initData); // Send fingerprint
  const timing = await talon.sdkInitComplete(session);
  const respBody: SessionData = {
    site_key: session.session.plan.h_captcha.site_key,
    timing,
    session,
  };
  res.status(200).send(respBody);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, SessionData, any>('/execute', async (req, res) => {
  L.debug({ body: req.body }, 'incoming /execute POST body');
  const timing = await talon.challengeReady(req.body.session, req.body.timing);
  await talon.challengeExecute(req.body.session, timing);
  res.status(200).send();
});

interface CompleteBody {
  hCaptchaKey: string;
  session: talon.PhaserSession;
  initData: talon.InitData;
  id: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, CompleteBody, any>('/complete', async (req, res) => {
  L.debug({ body: req.body }, 'incoming /complete POST body');
  const captchaKey = talon.assembleFinalCaptchaKey(
    req.body.session,
    req.body.initData,
    req.body.hCaptchaKey
  );
  await responseManualCaptcha({
    id: req.body.id,
    sessionData: captchaKey,
  });
  res.status(200).send();
});

const baseUrl = new URL(config.baseUrl);
const basePath = baseUrl.pathname;

app.use(basePath, router);

app.listen(config.serverPort);
