import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';

import { HttpsProxyAgent } from 'https-proxy-agent';

import type { getNotifierAxiosConfig } from '../src/notify-axios-config.js';

const originalHttpProxy = process.env.HTTP_PROXY;
const originalHttpsProxy = process.env.HTTPS_PROXY;
const originalLowerHttpProxy = process.env.http_proxy;
const originalLowerHttpsProxy = process.env.https_proxy;

function clearProxyEnv(): void {
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.http_proxy;
  delete process.env.https_proxy;
}

afterEach(() => {
  clearProxyEnv();

  if (originalHttpProxy) {
    process.env.HTTP_PROXY = originalHttpProxy;
  }

  if (originalHttpsProxy) {
    process.env.HTTPS_PROXY = originalHttpsProxy;
  }

  if (originalLowerHttpProxy) {
    process.env.http_proxy = originalLowerHttpProxy;
  }

  if (originalLowerHttpsProxy) {
    process.env.https_proxy = originalLowerHttpsProxy;
  }
});

beforeEach(() => {
  clearProxyEnv();
});

async function importGetNotifierAxiosConfig(): Promise<typeof getNotifierAxiosConfig> {
  const cacheKey = randomUUID();
  const module = await import(`../src/notify-axios-config.js?cache=${cacheKey}`);
  return module.getNotifierAxiosConfig as typeof getNotifierAxiosConfig;
}

test('returns the original config when proxy env vars are not set', async () => {
  const localGetNotifierAxiosConfig = await importGetNotifierAxiosConfig();
  const config = { responseType: 'json' as const };

  assert.strictEqual(localGetNotifierAxiosConfig(config), config);
});

test('adds proxy agents from https_proxy before http_proxy', async () => {
  process.env.http_proxy = 'http://http-proxy.example:3128';
  process.env.https_proxy = 'http://https-proxy.example:8080';

  const localGetNotifierAxiosConfig = await importGetNotifierAxiosConfig();
  const config = localGetNotifierAxiosConfig({ responseType: 'text' });

  assert.ok(config.httpAgent instanceof HttpsProxyAgent);
  assert.strictEqual(config.httpAgent, config.httpsAgent);
  assert.strictEqual(config.proxy, false);
  assert.strictEqual(config.responseType, 'text');
  assert.strictEqual(config.httpAgent.proxy.href, 'http://https-proxy.example:8080/');
});

test('adds proxy agents from HTTPS_PROXY before HTTP_PROXY', async () => {
  process.env.HTTP_PROXY = 'http://upper-http-proxy.example:3128';
  process.env.HTTPS_PROXY = 'http://upper-https-proxy.example:8080';

  const localGetNotifierAxiosConfig = await importGetNotifierAxiosConfig();
  const config = localGetNotifierAxiosConfig();

  assert.ok(config.httpAgent instanceof HttpsProxyAgent);
  assert.strictEqual(config.httpAgent, config.httpsAgent);
  assert.strictEqual(config.proxy, false);
  assert.strictEqual(config.httpAgent.proxy.href, 'http://upper-https-proxy.example:8080/');
});

test('adds proxy agents from HTTP_PROXY', async () => {
  process.env.HTTP_PROXY = 'http://upper-http-proxy.example:3128';

  const localGetNotifierAxiosConfig = await importGetNotifierAxiosConfig();
  const config = localGetNotifierAxiosConfig();

  assert.ok(config.httpAgent instanceof HttpsProxyAgent);
  assert.strictEqual(config.httpAgent, config.httpsAgent);
  assert.strictEqual(config.proxy, false);
  assert.strictEqual(config.httpAgent.proxy.href, 'http://upper-http-proxy.example:3128/');
});

test('adds proxy agents from http_proxy', async () => {
  process.env.http_proxy = 'http://http-proxy.example:3128';

  const localGetNotifierAxiosConfig = await importGetNotifierAxiosConfig();
  const config = localGetNotifierAxiosConfig();

  assert.ok(config.httpAgent instanceof HttpsProxyAgent);
  assert.strictEqual(config.httpAgent, config.httpsAgent);
  assert.strictEqual(config.proxy, false);
  assert.strictEqual(config.httpAgent.proxy.href, 'http://http-proxy.example:3128/');
});

test('uppercase proxy env vars take priority over lowercase proxy env vars', async () => {
  process.env.HTTPS_PROXY = 'http://upper-https-proxy.example:8080';
  process.env.https_proxy = 'http://lower-https-proxy.example:8080';

  const localGetNotifierAxiosConfig = await importGetNotifierAxiosConfig();
  const config = localGetNotifierAxiosConfig();

  assert.ok(config.httpAgent instanceof HttpsProxyAgent);
  assert.strictEqual(config.httpAgent, config.httpsAgent);
  assert.strictEqual(config.proxy, false);
  assert.strictEqual(config.httpAgent.proxy.href, 'http://upper-https-proxy.example:8080/');
});
