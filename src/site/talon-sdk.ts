/* eslint-disable @typescript-eslint/camelcase */
import got from 'got';
import L from '../common/logger';

export type EventType = 'sdk_init' | 'sdk_init_complete' | 'challenge_ready' | 'challenge_execute';

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

const PHASER_F_ENDPOINT = 'https://talon-service-prod.ak.epicgames.com/v1/phaser/f';
const TALON_IP_ENDPOINT = 'https://talon-service-v4-prod.ak.epicgames.com/v1/init/ip';
const TALON_INIT_ENDPOINT = 'https://talon-service-prod.ak.epicgames.com/v1/init';

async function sendPhaserEvent(
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
  L.trace({ body, PHASER_F_ENDPOINT }, 'POST');
  await got.post(PHASER_F_ENDPOINT, { json: body });
  return timing;
}

export async function sdkInit(): Promise<void> {
  await sendPhaserEvent('sdk_init');
}

export async function sdkInitComplete(session: PhaserSession): Promise<Timing[]> {
  return sendPhaserEvent('sdk_init_complete', session);
}

export async function challengeReady(
  session: PhaserSession,
  oldTiming: Timing[]
): Promise<Timing[]> {
  return sendPhaserEvent('challenge_ready', session, oldTiming);
}

export async function challengeExecute(
  session: PhaserSession,
  oldTiming: Timing[]
): Promise<Timing[]> {
  return sendPhaserEvent('challenge_execute', session, oldTiming);
}

export async function initIp(): Promise<ClientIp> {
  const resp = await got.get<ClientIp>(TALON_IP_ENDPOINT, { responseType: 'json' });
  return resp.body;
}

export async function initTalon(clientIp: ClientIp, initData: InitData): Promise<PhaserSession> {
  const body: InitBody = {
    flow_id: 'login_prod',
    client_ip: clientIp,
    ...initData,
  };
  L.trace({ body, TALON_INIT_ENDPOINT }, 'POST');
  const resp = await got.post<PhaserSession>(TALON_INIT_ENDPOINT, {
    json: body,
    responseType: 'json',
  });
  return resp.body;
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

export async function completeTalonSession(initData: InitData): Promise<PhaserSession> {
  await sdkInit();
  const clientIp = await initIp();
  const session = await initTalon(clientIp, initData); // Send fingerprint
  let timing = await sdkInitComplete(session);
  timing = await challengeReady(session, timing);
  await challengeExecute(session, timing);
  return session;
}
