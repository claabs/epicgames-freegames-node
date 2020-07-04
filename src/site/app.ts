import express from 'express';
import path from 'path';
import { URL } from 'url';
import L from '../common/logger';
import { config } from '../common/config';
import { responseManualCaptcha, CaptchaSolution } from '../captcha';

const app = express();

const router = express.Router();

router.use(express.static(path.join(__dirname, 'public')));
router.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, any, CaptchaSolution, any>('/solve', async (req, res) => {
  L.debug({ body: req.body }, 'incoming POST body');
  // Send token
  await responseManualCaptcha(req.body);
  res.status(200).send();
});

const baseUrl = new URL(config.baseUrl);
const basePath = baseUrl.pathname;

app.use(basePath, router);

app.listen(config.serverPort);
