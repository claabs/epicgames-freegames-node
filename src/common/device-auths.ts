import fsx from 'fs-extra/esm';
import path from 'path';
import L from './logger.js';
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

export interface DeviceAuthsFile {
  [account: string]: AuthTokenResponse;
}

const deviceAuthsFilename = path.join(CONFIG_DIR, `device-auths.json`);

export function getDeviceAuths(): DeviceAuthsFile | undefined {
  try {
    const deviceAuths: DeviceAuthsFile = fsx.readJSONSync(deviceAuthsFilename, 'utf-8');
    return deviceAuths;
  } catch (err) {
    L.trace(err.message);
    return undefined;
  }
}

export function getAccountAuth(account: string): AuthTokenResponse | undefined {
  const deviceAuths = getDeviceAuths();
  return deviceAuths?.[account];
}

export function writeDeviceAuths(deviceAuths: DeviceAuthsFile): void {
  fsx.outputJSONSync(deviceAuthsFilename, deviceAuths, 'utf-8');
}

export function setAccountAuth(account: string, accountAuth: AuthTokenResponse): void {
  const existingDeviceAuths = getDeviceAuths() || {};
  existingDeviceAuths[account] = accountAuth;
  writeDeviceAuths(existingDeviceAuths);
}
