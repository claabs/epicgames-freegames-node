import baseAxios from 'axios';
import { ProxyAgent } from 'proxy-agent';

// proxy-agent uses environment variables to determine proxy configurations.
// In details, proxy-from-env determins what proxy to use.
// Read more https://github.com/Rob--W/proxy-from-env#environment-variables
const agent = new ProxyAgent();

const axios = baseAxios.create({
  httpAgent: agent,
  httpsAgent: agent,
  proxy: false,
});

export default axios;
