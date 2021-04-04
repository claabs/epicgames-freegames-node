/* eslint-disable @typescript-eslint/camelcase */
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import { URL } from 'url';
import proxy from 'express-http-proxy';
import nocache from 'nocache';
import got from 'got';
import asyncHandler from 'express-async-handler';
import cookieParser from 'cookie-parser';
// import jwt from 'jsonwebtoken';
import L from '../common/logger';
import { config } from '../common/config';
import { getPendingCaptcha, responseManualCaptcha } from '../captcha';
import TalonSdk, { assembleFinalCaptchaKey, InitData, PhaserSession, Timing } from './talon-sdk';
import { TALON_REFERRER, TALON_WEBSITE_BASE } from '../common/constants';
import { getCookies, setCookie } from '../common/request';

function filterNecessaryCookies(cookies: [string, string][]): [string, string][] {
  const validKeys = [
    'bm_sz',
    'bm_sv',
    'ak_bmsc',
    '_abck',
    'XSRF-TOKEN',
    'EPIC_SESSION_REPUTATION',
    'EPIC_SESSION_ID',
    'EPIC_SESSION_AP',
    'EPIC_LOCALE_COOKIE',
    'EPIC_DEVICE',
  ];
  return cookies.filter(([key]) => validKeys.includes(key));
}

const baseUrl = new URL(config.baseUrl);
const basePath = baseUrl.pathname;

const app = express();
app.use(cookieParser());
app.disable('etag');
const router = express.Router();
router.use(nocache());

// Replace the hostname in the various hcaptcha process calls
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
    proxyReqBodyDecorator: proxyReqData => {
      let data: string = proxyReqData.toString('utf8');
      if (data.includes(baseUrl.hostname)) {
        L.trace(data, 'replacing data component');
        data = data.replace(
          new RegExp(baseUrl.hostname, 'g'),
          'talon-website-prod.ak.epicgames.com'
        );
        L.trace({ data }, 'updated data');
      }
      return data;
    },
    proxyReqOptDecorator: proxyReqOpts => {
      const req = proxyReqOpts;
      if (
        req.headers &&
        (req.path?.includes('checkcaptcha') ||
          req.path?.includes('checksiteconfig') ||
          req.path?.includes('getcaptcha'))
      ) {
        if (req.headers.referer)
          req.headers.referer = (req.headers.referer as string).replace(
            new RegExp(baseUrl.host, 'g'),
            'assets.hcaptcha.com'
          );
        if (req.headers.origin)
          req.headers.origin = (req.headers.referer as string).replace(
            new RegExp(baseUrl.host, 'g'),
            'assets.hcaptcha.com'
          );
        L.trace({ headers: req.headers }, 'new headers');
      }
      return req;
    },
    // hCaptcha returns an assets URL in a JWT, but it doesn't seem necessary to patch it...yet
    // userResDecorator: (_proxyRes, proxyResData, userReq) => {
    //   let data: string = proxyResData.toString('utf8');
    //   if (userReq.path.includes('checksiteconfig') || userReq.path.includes('getcaptcha')) {
    //     const resData = JSON.parse(data);
    //     const token = resData.c.req;
    //     const decParts = jwt.decode(token, { complete: true, json: false }) as Record<string, any>;
    //     const { payload } = decParts;
    //     payload.l = payload.l.replace(
    //       new RegExp('assets.hcaptcha.com', 'g'),
    //       `${baseUrl.host}/assets`
    //     );
    //     const newToken = jwt.sign(payload, 'secret', {
    //       algorithm: 'HS256',
    //     });
    //     resData.c.req = newToken;
    //     data = JSON.stringify(resData);
    //   }
    //   return data;
    // },
  }),
  nocache()
);

const insertTags = (data: string, url: string, component: string): string => {
  if (url.includes(`${component}.html`)) {
    let updatedData = data;
    const scriptElem = `<script type="text/javascript" src="../${component}.js"></script>`;
    const cssElem = `<link rel="stylesheet" type="text/css" href="css/style.css">`;
    updatedData = updatedData.replace(/<script.*<\/script>/, ''); // Delete script, since it still works on .com sites
    // Manually insert CSS and JS tags
    updatedData = updatedData.replace(/\n<\/head>/, `\n${scriptElem}\n${cssElem}\n</head>`);
    updatedData = updatedData.replace(/<meta http-equiv="Content-Security-Policy".*?>/, '');
    return updatedData;
  }
  return data;
};
// HCaptcha assets proxy, fixes issues on HTTP clients
router.use(
  '/assets',
  proxy('https://assets.hcaptcha.com', {
    userResDecorator: (_proxyRes, proxyResData, userReq) => {
      let data: string = proxyResData
        .toString('utf8')
        .replace(new RegExp('https://assets.hcaptcha.com', 'g'), `${baseUrl.origin}/assets`);
      // Manually place JS and CSS elements since hcaptcha's dynamic code doesn't work on http or non-.com domains
      data = insertTags(data, userReq.url, 'hcaptcha-checkbox');
      data = insertTags(data, userReq.url, 'hcaptcha-challenge');
      // Replace hcaptcha.com URL in hcaptcha js
      if (
        userReq.url.includes('hcaptcha-checkbox.js') ||
        userReq.url.includes('hcaptcha-challenge.js')
      ) {
        data = data.replace(
          /endpoint:"https:\/\/hcaptcha\.com"/g,
          `endpoint:"${baseUrl.origin}/proxy"`
        );
      }
      return data;
    },
  }),
  nocache()
);

// Replace every hostname available in the Akamai device info
router.use(
  '/utils',
  proxy(TALON_WEBSITE_BASE, {
    // Keeps /utils at the base of the path
    proxyReqPathResolver: req => {
      L.trace(req);
      return req.originalUrl;
    },
    // Updates Akamai request headers
    proxyReqOptDecorator: proxyReqOpts => {
      const { headers } = proxyReqOpts;
      const updatedHeaders = {
        ...headers,
        referrer: TALON_REFERRER,
        origin: TALON_WEBSITE_BASE,
      };
      const updatedReq = proxyReqOpts;
      updatedReq.headers = updatedHeaders;
      return updatedReq;
    },
    // Updates URL in Akamai sensor_data body
    proxyReqBodyDecorator: (bodyContent: Buffer) => {
      const body = bodyContent.toString();
      const updatedBody = body.replace(
        new RegExp(`https://${baseUrl.host}.*?,`, 'g'),
        `${TALON_REFERRER}-1,`
      );
      L.trace({ updatedBody });
      return updatedBody;
    },
    // Updates cookie domain to keep Akamai happy
    userResHeaderDecorator: headers => {
      const updatedHeaders = headers;
      let cookieHeader = headers['set-cookie'];
      if (cookieHeader) {
        cookieHeader = cookieHeader.map(value => value.replace(/epicgames\.com/, baseUrl.host));
      }
      updatedHeaders['set-cookie'] = cookieHeader;
      return updatedHeaders;
    },
  }),
  nocache()
);
router.use(
  '/akam',
  proxy('https://talon-website-prod.ak.epicgames.com', {
    // Use original path
    proxyReqPathResolver: req => {
      L.trace(req);
      return req.originalUrl;
    },
    // Updates Akamai request headers
    proxyReqOptDecorator: proxyReqOpts => {
      const { headers } = proxyReqOpts;
      const updatedHeaders = {
        ...headers,
        referrer: TALON_REFERRER,
        origin: TALON_WEBSITE_BASE,
      };
      const updatedReq = proxyReqOpts;
      updatedReq.headers = updatedHeaders;
      return updatedReq;
    },
    // Updates cookie domain to keep Akamai happy
    userResHeaderDecorator: headers => {
      const updatedHeaders = headers;
      let cookieHeader = headers['set-cookie'];
      if (cookieHeader) {
        cookieHeader = cookieHeader.map(value => value.replace(/epicgames\.com/, baseUrl.host));
        updatedHeaders['set-cookie'] = cookieHeader;
      }
      return updatedHeaders;
    },
  }),
  nocache()
);
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
  }),
  nocache()
);

router.get(
  '/challenge/grid/challenge.js',
  asyncHandler(async (_req, res) => {
    L.trace('incoming /challenge/grid/challenge.js request');
    const resp = await got.get(`https://hcaptcha.com/challenge/grid/challenge.js`, {
      followRedirect: true,
      responseType: 'text',
    });
    const body = resp.body.replace(
      new RegExp('https://assets.hcaptcha.com', 'g'),
      `${baseUrl.origin}/assets`
    );
    res.header('content-type', resp.headers['content-type']);
    res.status(200).send(body);
  }),
  nocache()
);

interface InitReq {
  initData: InitData;
  id: string;
}

interface InitResp {
  captchaKey: string;
  provider: 'h_captcha' | 'arkose';
  blob?: string;
  session: Record<string, any>;
  timing: Record<string, any>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, InitResp, InitReq, any>(
  '/init',
  asyncHandler(async (req, res) => {
    if (!req.headers?.['user-agent']) {
      res.status(400).send('user-agent header required');
      return;
    }
    L.trace({ body: req.body }, 'incoming /init POST body');
    const { initData, id } = req.body;
    const { email, xsrfToken } = getPendingCaptcha(id);
    const talon = new TalonSdk(email, req.headers['user-agent'], xsrfToken);
    const talonSessionResp = await talon.beginTalonSession(initData);
    const { session, timing, blob } = talonSessionResp;
    const provider = session.session.plan.mode;
    const captchaKey =
      session.session.plan.mode === 'h_captcha'
        ? session.session.plan.h_captcha.site_key
        : session.session.plan.arkose.public_key;
    const cookies = getCookies(email);
    const cookieEntries = filterNecessaryCookies(Object.entries(cookies));
    cookieEntries.forEach(([key, value]) => res.cookie(key, value));
    const resBody: InitResp = {
      captchaKey,
      blob,
      provider,
      session,
      timing,
    };
    res.status(200).send(resBody);
  })
);

interface OpenedBody {
  id: string;
  session: PhaserSession;
  timing: Timing[];
}

interface OpenedResp {
  session: Record<string, any>;
  timing: Record<string, any>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post<any, OpenedResp, OpenedBody, any>(
  '/opened',
  asyncHandler(async (req, res) => {
    if (!req.headers?.['user-agent']) {
      res.status(400).send('user-agent header required');
      return;
    }
    L.trace({ body: req.body }, 'incoming /complete POST body');
    const { _abck } = req.cookies;
    const { id } = req.body;
    let { session, timing } = req.body;
    const { email, xsrfToken } = getPendingCaptcha(id);
    if (_abck) setCookie(email, '_abck', _abck);
    const talon = new TalonSdk(email, req.headers['user-agent'], xsrfToken);
    ({ session, timing } = await talon.handleCaptchaOpened(session, timing));
    const cookies = getCookies(email);
    const cookieEntries = filterNecessaryCookies(Object.entries(cookies));
    cookieEntries.forEach(([key, value]) => res.cookie(key, value));
    const resBody: OpenedResp = {
      session,
      timing,
    };
    res.status(200).send(resBody);
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
    const { _abck } = req.cookies;
    const { id, captchaResult, initData, session, timing } = req.body;
    const { email, xsrfToken } = getPendingCaptcha(id);
    if (_abck) setCookie(email, '_abck', _abck);
    const talon = new TalonSdk(email, req.headers['user-agent'], xsrfToken);
    await talon.challengeComplete(session, timing); // Maybe not needed? This occurs after login
    await talon.sendBatchEvents();
    const sessionData = assembleFinalCaptchaKey(session, initData, captchaResult);
    await responseManualCaptcha({ id, sessionData });
    const cookies = getCookies(email);
    const cookieEntries = filterNecessaryCookies(Object.entries(cookies));
    cookieEntries.forEach(([key, value]) => res.cookie(key, value));
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

app.use(basePath, router);

app.listen(config.serverPort);
