import { HttpsProxyAgent } from 'https-proxy-agent';

import type { AxiosRequestConfig } from 'axios';

const PROXY =
  process.env.HTTPS_PROXY ??
  process.env.https_proxy ??
  process.env.HTTP_PROXY ??
  process.env.http_proxy;

export function getNotifierAxiosConfig(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  if (!PROXY) {
    return config;
  }

  const agent = new HttpsProxyAgent(PROXY);
  return {
    ...config,
    httpAgent: agent,
    httpsAgent: agent,
    proxy: false,
  };
}
