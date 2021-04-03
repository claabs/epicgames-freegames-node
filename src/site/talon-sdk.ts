/* eslint-disable @typescript-eslint/camelcase */
import { Got } from 'got';
import { Logger } from 'pino';
import {
  PHASER_BATCH_ENDPOINT,
  TALON_INIT_ENDPOINT,
  TALON_IP_ENDPOINT,
  TALON_EXECUTE_ENDPOINT,
} from '../common/constants';
import logger from '../common/logger';
import { newCookieJar } from '../common/request';

export type EventType =
  | 'sdk_load'
  | 'sdk_init'
  | 'sdk_init_complete'
  | 'challenge_ready'
  | 'sdk_execute'
  | 'challenge_execute'
  | 'challenge_opened'
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

export type Plan = HcaptchaPlan | ArkosePlan;
export interface HcaptchaPlan {
  mode: 'h_captcha';
  h_captcha: HCaptcha;
}

export interface ArkosePlan {
  mode: 'arkose';
  arkose: Arkose;
}

export interface HCaptcha {
  plan_name: string;
  site_key: string;
}

export interface Arkose {
  plan_name: string;
  public_key: string;
  sdk_base_url: string;
}

export interface PhaserEvent {
  event: EventType;
  session?: PhaserSession;
  timing: Timing[];
  errors: string[];
}

export type PhaserBatchBody = PhaserEvent[];

export interface BeginSessionReturn extends Pick<PhaserEvent, 'timing'> {
  session: PhaserSession;
  blob?: string;
}

export interface InitData {
  v: number;
  xal: string;
  ewa: string;
  kid: string;
}

export interface InitBody {
  flow_id: string;
}

export interface ExecuteBody extends InitData {
  session: PhaserSession;
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

export type PlanResults = HCaptchaPlanResults | ArkosePlanResults;

export interface HCaptchaPlanResults {
  h_captcha: PlanResultsHCaptcha;
}

export interface ArkosePlanResults {
  arkose: PlanResultsArkose;
}

export interface PlanResultsHCaptcha {
  value: string;
  resp_key: string;
}

export interface PlanResultsArkose {
  value: string;
}

export type TalonExecuteResponse = HCaptchaExecuteResponse | ArkoseExecuteResponse;

export interface HCaptchaExecuteResponse {
  h_captcha: {
    data: string;
  };
}
export interface ArkoseExecuteResponse {
  arkose: {
    data: {
      blob: string;
    };
  };
}

export default class TalonSdk {
  private L: Logger;

  private userAgent: string;

  private xsrfToken: string;

  private request: Got;

  private eventBuffer: PhaserEvent[] = [];

  constructor(email: string, userAgent: string, xsrfToken: string) {
    this.L = logger.child({
      user: email,
    });
    this.userAgent = userAgent;
    this.request = newCookieJar(email);
    this.xsrfToken = xsrfToken;
  }

  private async sendPhaserEvent(
    event: EventType,
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
    this.L.trace({ body }, 'Add to event buffer');

    this.eventBuffer.push(body);
    return timing;
  }

  async sendBatchEvents(): Promise<void> {
    const body = this.eventBuffer;
    this.L.trace({ body, PHASER_BATCH_ENDPOINT }, 'POST');
    await this.request.post(PHASER_BATCH_ENDPOINT, {
      json: body,
      headers: this.getHeaders('https://talon-website-prod.ak.epicgames.com'),
    });
    this.eventBuffer = [];
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
      'x-xsrf-token': this.xsrfToken,
    };
  }

  async sdkLoad(): Promise<void> {
    await this.sendPhaserEvent('sdk_load');
  }

  async sdkInit(): Promise<Timing[]> {
    return this.sendPhaserEvent('sdk_init');
  }

  async sdkInitComplete(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('sdk_init_complete', session, oldTiming);
  }

  async challengeReady(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('challenge_ready', session, oldTiming);
  }

  async challengeExecute(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('challenge_execute', session, oldTiming);
  }

  async challengeOpened(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('challenge_opened', session, oldTiming);
  }

  async sdkExecute(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('sdk_execute', session, oldTiming);
  }

  async challengeComplete(session: PhaserSession, oldTiming: Timing[]): Promise<Timing[]> {
    return this.sendPhaserEvent('challenge_complete', session, oldTiming);
  }

  async initIp(): Promise<ClientIp> {
    this.L.trace({ TALON_IP_ENDPOINT }, 'GET');
    const resp = await this.request.get<ClientIp>(TALON_IP_ENDPOINT, {
      responseType: 'json',
      headers: this.getHeaders('https://talon-website-prod.ak.epicgames.com'),
    });
    return resp.body;
  }

  async initTalon(): Promise<PhaserSession> {
    const body: InitBody = {
      flow_id: 'login_prod',
      // ...initData,
    };
    this.L.trace({ body, TALON_INIT_ENDPOINT }, 'POST');
    const resp = await this.request.post<PhaserSession>(TALON_INIT_ENDPOINT, {
      json: body,
      responseType: 'json',
      headers: this.getHeaders('https://talon-website-prod.ak.epicgames.com'),
    });
    this.L.trace({ resp: resp.body }, 'Init Talon response');
    return resp.body;
  }

  async executeTalon(initData: InitData, session: PhaserSession): Promise<TalonExecuteResponse> {
    const body: ExecuteBody = {
      session,
      ...initData,
    };
    this.L.trace({ body, TALON_EXECUTE_ENDPOINT }, 'POST');
    const resp = await this.request.post<TalonExecuteResponse>(TALON_EXECUTE_ENDPOINT, {
      json: body,
      responseType: 'json',
      headers: this.getHeaders('https://talon-website-prod.ak.epicgames.com'),
    });
    this.L.trace({ resp: resp.body }, 'Execute Talon response');
    return resp.body;
  }

  async beginTalonSession(initData: InitData): Promise<BeginSessionReturn> {
    await this.sdkLoad();
    let timing = await this.sdkInit();
    const session = await this.initTalon(); // Send fingerprint
    timing = await this.sdkInitComplete(session, timing);
    timing = await this.challengeReady(session, timing);
    timing = await this.sdkExecute(session, timing);
    const executeResp = await this.executeTalon(initData, session);
    let blob: string | undefined;
    if ('arkose' in executeResp) {
      blob = executeResp.arkose.data.blob;
    }
    if ('h_captcha' in executeResp) {
      blob = executeResp.h_captcha.data;
    }
    timing = await this.challengeExecute(session, timing);
    this.sendBatchEvents();
    return { session, timing, blob };
  }
}

export function assembleFinalCaptchaKey(
  session: PhaserSession,
  initData: InitData,
  captchaResult: string
): string {
  let planResults: PlanResults;
  if (session.session.plan.mode === 'h_captcha') {
    planResults = {
      h_captcha: {
        value: captchaResult,
        resp_key: '',
      },
    };
  } else {
    planResults = {
      arkose: {
        value: captchaResult,
      },
    };
  }

  const captchaJson: FinalCaptchaJson = {
    session_wrapper: session,
    plan_results: planResults,
    ...initData,
  };
  return Buffer.from(JSON.stringify(captchaJson)).toString('base64');
}
