import path from 'node:path';

import fsx from 'fs-extra/esm';

import { CONFIG_DIR } from './config/index.ts';
import logger from './logger.ts';

export interface AuthTokenResponse {
  access_token: string;
  expires_in: number;
  expires_at: string;
  token_type: string;
  refresh_token: string;
  refresh_expires: number;
  refresh_expires_at: string;
  account_id: string;
  client_id: string;
  internal_client: boolean;
  client_service: string;
  displayName: string;
  app: string;
  in_app_id: string;
  product_id: string;
  application_id: string;
}

export type DeviceAuthsFile = Record<string, AuthTokenResponse>;

const deviceAuthsFilename = path.join(CONFIG_DIR, `device-auths.json`);

export async function getDeviceAuths(): Promise<DeviceAuthsFile | undefined> {
  try {
    const deviceAuths = (await fsx.readJSON(deviceAuthsFilename, 'utf8')) as DeviceAuthsFile;
    return deviceAuths;
  } catch (error) {
    logger.trace(error);
    return undefined;
  }
}

export async function getAccountAuth(account: string): Promise<AuthTokenResponse | undefined> {
  const deviceAuths = await getDeviceAuths();
  return deviceAuths?.[account];
}

export async function writeDeviceAuths(deviceAuths: DeviceAuthsFile): Promise<void> {
  await fsx.outputJSON(deviceAuthsFilename, deviceAuths, 'utf8');
}

export async function setAccountAuth(
  account: string,
  accountAuth: AuthTokenResponse,
): Promise<void> {
  const existingDeviceAuths = (await getDeviceAuths()) ?? {};
  existingDeviceAuths[account] = accountAuth;
  await writeDeviceAuths(existingDeviceAuths);
}
