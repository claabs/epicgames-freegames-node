import https from 'node:https';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';

import { config } from './config/index.js';

const app = express();
const router = express.Router();

const baseUrl = config.webPortalConfig?.baseUrl
  ? new URL(config.webPortalConfig?.baseUrl)
  : undefined;
const basePath = baseUrl?.pathname ?? '/';

app.use(basePath, router);
export const serverRoute = router;

export async function createServer(): Promise<http.Server> {
  let server: http.Server;
  if (
    config.webPortalConfig?.serverOpts &&
    Object.entries(config.webPortalConfig?.serverOpts).length > 0
  ) {
    // The serverOpts are mostly HTTPS-related options, so use `https` if there's any options set
    server = https.createServer(config.webPortalConfig?.serverOpts, app);
  } else {
    // Otherwise, we just use `http`. This is pretty much the first half of `app.listen()`
    server = http.createServer(app);
  }
  server = server.listen(config.webPortalConfig?.listenOpts ?? 3000);
  await once(server, 'listening');
  return server;
}
