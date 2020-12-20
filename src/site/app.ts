/* eslint-disable @typescript-eslint/camelcase */
import express from 'express';
import path from 'path';
import { URL } from 'url';

import L from '../common/logger';
import { config } from '../common/config';
import { receiveTalonData } from '../captcha';
import { completeTalonSession, InitData } from './talon-sdk';

const app = express();

const router = express.Router();

router.use(express.static(path.join(__dirname, 'public')));
router.use(express.json());

interface UIResponse {
  id: string;
  initData: InitData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, UIResponse, any>('/init', async (req, res) => {
  L.debug({ body: req.body }, 'incoming /init POST body');
  const { initData, id } = req.body;
  let session = await completeTalonSession(initData);
  while (!session.session.plan.h_captcha?.site_key) {
    // eslint-disable-next-line no-await-in-loop
    session = await completeTalonSession(initData);
  }
  res.status(200).send();
  receiveTalonData({
    id,
    initData,
    session,
  });
});

const baseUrl = new URL(config.baseUrl);
const basePath = baseUrl.pathname;

app.use(basePath, router);

app.listen(config.serverPort);
