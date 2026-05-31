import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { ProxyAgent } from 'proxy-agent';

import axios from '../src/axios-base.js';

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

function restoreProxyEnv(): void {
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
}

afterEach(() => {
  restoreProxyEnv();
});

beforeEach(() => {
  clearProxyEnv();
});

test('configures axios to use ProxyAgent for http and https requests', () => {
  assert.ok(axios.defaults.httpAgent instanceof ProxyAgent);
  assert.strictEqual(axios.defaults.httpAgent, axios.defaults.httpsAgent);
  assert.strictEqual(axios.defaults.proxy, false);
});

test('ProxyAgent respects HTTPS_PROXY before HTTP_PROXY for https requests', () => {
  process.env.HTTP_PROXY = 'http://upper-http-proxy.example:3128';
  process.env.HTTPS_PROXY = 'http://upper-https-proxy.example:8080';

  assert.strictEqual(
    axios.defaults.httpAgent.getProxyForUrl('https://example.com', {} as never),
    'http://upper-https-proxy.example:8080',
  );
});

test('ProxyAgent respects HTTP_PROXY for http requests', () => {
  process.env.HTTP_PROXY = 'http://upper-http-proxy.example:3128';

  assert.strictEqual(
    axios.defaults.httpAgent.getProxyForUrl('http://example.com', {} as never),
    'http://upper-http-proxy.example:3128',
  );
});

test('ProxyAgent respects lowercase proxy env vars', () => {
  process.env.http_proxy = 'http://lower-http-proxy.example:3128';
  process.env.https_proxy = 'http://lower-https-proxy.example:8080';

  assert.strictEqual(
    axios.defaults.httpAgent.getProxyForUrl('https://example.com', {} as never),
    'http://lower-https-proxy.example:8080',
  );
});
