import localtunnel from 'localtunnel';
import { config } from './config';

export async function getLocaltunnelUrl(originalUrl: string): Promise<string> {
  const url = new URL(originalUrl);
  const tunnel = await localtunnel(config.webPortalConfig?.listenOpts?.port || 3000);
  const tunnelUrl = new URL(tunnel.url);
  Array.from(url.searchParams.entries()).forEach(([name, val]) => {
    tunnelUrl.searchParams.set(name, val);
  });
  return tunnelUrl.toString();
}
