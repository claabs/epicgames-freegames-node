import localtunnel from 'localtunnel';
import axios from 'axios';
import { config } from './config';
import logger from './logger';

export interface LocaltunnelResponse {
  url: string;
  password?: string;
}

async function getPassword(): Promise<string | undefined> {
  try {
    const resp = await axios.get<string>('https://loca.lt/mytunnelpassword', {
      responseType: 'text',
    });
    return resp.data;
  } catch (err) {
    logger.error(err);
  }
  return undefined;
}

export async function getLocaltunnelUrl(originalUrl: string): Promise<LocaltunnelResponse> {
  const url = new URL(originalUrl);
  const [password, tunnel] = await Promise.all([
    getPassword(),
    localtunnel(config.webPortalConfig?.listenOpts?.port || 3000),
  ]);

  const tunnelUrl = new URL(tunnel.url);
  tunnelUrl.pathname = url.pathname;
  return { url: tunnelUrl.toString(), password };
}
