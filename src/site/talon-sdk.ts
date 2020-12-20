/* eslint-disable @typescript-eslint/camelcase */
import got from 'got';
import { Logger } from 'pino';
import { PHASER_F_ENDPOINT, TALON_INIT_ENDPOINT, TALON_IP_ENDPOINT } from '../common/constants';
import logger from '../common/logger';

export type EventType =
  | 'sdk_init'
  | 'sdk_init_complete'
  | 'challenge_ready'
  | 'challenge_execute'
  | 'challenge_complete';

export interface Timing {
  event: EventType;
  timestamp: string;
}

export interface PhaserSession {
  session: Session;
  signature: string;
}

export interface Session {
  version: number;
  id: string;
  flow_id: string;
  ip_address: string;
  timestamp: string;
  plan: Plan;
}

export interface Plan {
  mode: string;
  h_captcha: HCaptcha;
}

export interface HCaptcha {
  plan_name: string;
  site_key: string;
}

export interface PhaserEvent {
  event: EventType;
  session?: PhaserSession;
  timing: Timing[];
  errors: string[];
}

export interface BeginSessionReturn extends Pick<PhaserEvent, 'timing'> {
  session: PhaserSession;
}

export interface InitData {
  v: number;
  xal: string;
  ewa: string;
  kid: string;
}

export interface InitBody extends InitData {
  flow_id: string;
  client_ip: ClientIp;
}

export interface ClientIp {
  timestamp: string; // Long timestamp
  ip_address: string;
  signature: string;
}

export interface FinalCaptchaJson extends InitData {
  session_wrapper: PhaserSession;
  plan_results: PlanResults;
}

export interface PlanResults {
  h_captcha: PlanResultsHCaptcha;
}

export interface PlanResultsHCaptcha {
  value: string;
  resp_key: string;
}

export default class TalonSdk {
  private L: Logger;

  private userAgent: string;

  constructor(email: string, userAgent: string) {
    this.L = logger.child({
      user: email,
    });
    this.userAgent = userAgent;
  }

  private async sendPhaserEvent(
    event: EventType,
    referrerOrigin: string,
    session?: PhaserSession,
    oldTiming?: Timing[]
  ): Promise<Timing[]> {
    const timing: Timing[] = [
      ...(oldTiming || []),
      {
        event,
        timestamp: new Date().toISOString(),
      },
    ];

    const body: PhaserEvent = {
      event,
      session,
      timing,
      errors: [],
    };
    this.L.trace({ body, PHASER_F_ENDPOINT }, 'POST');
    await got.post(PHASER_F_ENDPOINT, {
      json: body,
      headers: this.getHeaders(referrerOrigin),
    });
    return timing;
  }

  private getHeaders(referrerOrigin: string): Record<string, string> {
    return {
      pragma: 'no-cache',
      'cache-control': 'no-cache',
      'user-agent': this.userAgent,
      origin: referrerOrigin,
      name: 'sec-fetch-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      referer: `${referrerOrigin}/`,
    };
  }

  async sdkInit(): Promise<void> {
    await this.sendPhaserEvent('sdk_init', 'https://www.epicgames.com');
  }

  async sdkInitComplete(session: PhaserSession): Promise<Timing[]> {
    return this.sendPhaserEvent('sdk_init_complete', 'https://www.epicgames.com', session);
  }

  async challengeReady(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('challenge_ready', 'https://www.epicgames.com', session, oldTiming);
  }

  async challengeExecute(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent(
      'challenge_execute',
      'https://www.epicgames.com',
      session,
      oldTiming
    );
  }

  async challengeComplete(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent(
      'challenge_complete',
      'https://www.epicgames.com',
      session,
      oldTiming
    );
  }

  async initIp(): Promise<ClientIp> {
    this.L.trace({ TALON_IP_ENDPOINT }, 'GET');
    const resp = await got.get<ClientIp>(TALON_IP_ENDPOINT, {
      responseType: 'json',
      headers: this.getHeaders('https://talon-website-prod.ak.epicgames.com'),
    });
    return resp.body;
  }

  async initTalon(clientIp: ClientIp, initData: InitData): Promise<PhaserSession> {
    const body: InitBody = {
      flow_id: 'login_prod',
      client_ip: clientIp,
      ...initData,
    };
    this.L.trace({ body, TALON_INIT_ENDPOINT }, 'POST');
    const resp = await got.post<PhaserSession>(TALON_INIT_ENDPOINT, {
      json: body,
      responseType: 'json',
      headers: this.getHeaders('https://talon-website-prod.ak.epicgames.com'),
    });
    return resp.body;
  }

  async beingTalonSession(initData: InitData): Promise<BeginSessionReturn> {
    await this.sdkInit();
    const clientIp = await this.initIp();
    const session = await this.initTalon(clientIp, initData); // Send fingerprint
    let timing = await this.sdkInitComplete(session);
    timing = await this.challengeReady(session, timing);
    timing = await this.challengeExecute(session, timing);
    return { session, timing };
  }
}

export function assembleFinalCaptchaKey(
  session: PhaserSession,
  initData: InitData,
  hCaptchaKey: string
): string {
  const captchaJson: FinalCaptchaJson = {
    session_wrapper: session,
    plan_results: {
      h_captcha: {
        value: hCaptchaKey,
        resp_key: '',
      },
    },
    ...initData,
  };
  return Buffer.from(JSON.stringify(captchaJson)).toString('base64');
}
