import https from 'https';
import http from 'http';
import { once } from 'events';
import { portalExpressApp } from './puppeteer';
import { config } from './config';

export async function createServer(): Promise<http.Server> {
  let server: http.Server;
  if (
    config.webPortalConfig?.serverOpts &&
    Object.entries(config.webPortalConfig?.serverOpts).length > 0
  ) {
    // The serverOpts are mostly HTTPS-related options, so use `https` if there's any options set
    server = https.createServer(config.webPortalConfig?.serverOpts, portalExpressApp);
  } else {
    // Otherwise, we just use `http`. This is pretty much the first half of `app.listen()`
    server = http.createServer(portalExpressApp);
  }
  server = server.listen(config.webPortalConfig?.listenOpts || 3000);
  server.headersTimeout = 0;
  server.requestTimeout = 0;
  await once(server, 'listening');
  return server;
}
