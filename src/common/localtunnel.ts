import localtunnel from 'localtunnel';

import { config } from './config/index.js';

export async function getLocaltunnelUrl(originalUrl: string): Promise<string> {
  const url = new URL(originalUrl);
  const tunnel = await localtunnel(config.webPortalConfig?.listenOpts?.port ?? 3000);
  const tunnelUrl = new URL(tunnel.url);
  tunnelUrl.pathname = url.pathname;
  return tunnelUrl.toString();
}
