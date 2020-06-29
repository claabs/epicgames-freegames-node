import express from 'express';
import path from 'path';
import L from '../common/logger';
import { responseManualCaptcha, CaptchaSolution } from '../captcha';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.post<any, any, CaptchaSolution, any>('/solve', async (req, res) => {
  L.debug({ body: req.body }, 'incoming POST body');
  // Send token
  await responseManualCaptcha(req.body);
  res.status(200).send();
});

app.listen(3000);
