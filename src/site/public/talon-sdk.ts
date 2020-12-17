/* eslint-disable @typescript-eslint/camelcase */
import axios from 'axios';
import { getInitData } from './talon-harness';

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

export interface InitBody {
  flow_id: string;
  client_ip: ClientIp;
  v: number;
  xal: string;
  ewa: string;
  kid: string;
}

export interface ClientIp {
  timestamp: string; // Long timestamp
  ip_address: string;
  signature: string;
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
  await axios.post(PHASER_F_ENDPOINT, body);
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
  const resp = await axios.get<ClientIp>(TALON_IP_ENDPOINT);
  return resp.data;
}

export async function initTalon(clientIp: ClientIp): Promise<PhaserSession> {
  const body: InitBody = {
    flow_id: 'login_prod',
    client_ip: clientIp,
    ...getInitData(),
  };
  const resp = await axios.post<PhaserSession>(TALON_INIT_ENDPOINT, body);
  return resp.data;
}
