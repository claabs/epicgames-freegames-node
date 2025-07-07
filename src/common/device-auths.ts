import fsx from 'fs-extra/esm';
import path from 'node:path';
import logger from './logger.js';
import { CONFIG_DIR } from './config/index.js';

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
    const deviceAuths: DeviceAuthsFile = await fsx.readJSON(deviceAuthsFilename, 'utf-8');
    return deviceAuths;
  } catch (err) {
    logger.trace(err.message);
    return undefined;
  }
}

export async function getAccountAuth(account: string): Promise<AuthTokenResponse | undefined> {
  const deviceAuths = await getDeviceAuths();
  return deviceAuths?.[account];
}

export async function writeDeviceAuths(deviceAuths: DeviceAuthsFile): Promise<void> {
  await fsx.outputJSON(deviceAuthsFilename, deviceAuths, 'utf-8');
}

export async function setAccountAuth(
  account: string,
  accountAuth: AuthTokenResponse,
): Promise<void> {
  const existingDeviceAuths = (await getDeviceAuths()) ?? {};
  existingDeviceAuths[account] = accountAuth;
  await writeDeviceAuths(existingDeviceAuths);
}
