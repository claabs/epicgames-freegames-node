import puppeteer from 'puppeteer-extra';
import { Cookie, Page, SetCookie } from 'puppeteer';
import PortalPlugin, {
  ChromiumRemoteDebuggingConnectionConfig,
  WebPortalConnectionConfig,
} from 'puppeteer-extra-plugin-portal';
import objectAssignDeep from 'object-assign-deep';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ToughCookieFileStore } from './request';
import { config } from './config';

const defaultWebPortalConfig: WebPortalConnectionConfig = {
  baseUrl: 'http://localhost:3000',
  listenOpts: {
    port: 3000,
  },
};

const defaultWebSocketConfig: ChromiumRemoteDebuggingConnectionConfig = {
  // baseUrl: 'ws://localhost:3001',
  // port: 3001,
};

puppeteer.use(
  PortalPlugin({
    webPortalConfig: objectAssignDeep(defaultWebPortalConfig, config.webPortalConfig),
    webSocketConfig: objectAssignDeep(defaultWebSocketConfig, config.webSocketConfig),
  })
);

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow'); // https://github.com/berstend/puppeteer-extra/issues/543
puppeteer.use(stealth);

export default puppeteer;

export function puppeteerCookieToToughCookieFileStore(
  puppetCookies: Cookie[]
): ToughCookieFileStore {
  const tcfs: ToughCookieFileStore = {};
  puppetCookies.forEach(puppetCookie => {
    const domain = puppetCookie.domain.replace(/^\./, '');
    const expires = new Date(puppetCookie.expires * 1000).toISOString();
    const { path, name } = puppetCookie;

    const temp: ToughCookieFileStore = {
      [domain]: {
        [path]: {
          [name]: {
            key: name,
            value: puppetCookie.value,
            expires,
            domain,
            path,
            secure: puppetCookie.secure,
            httpOnly: puppetCookie.httpOnly,
            hostOnly: !puppetCookie.domain.startsWith('.'),
          },
        },
      },
    };
    objectAssignDeep(tcfs, temp);
  });
  return tcfs;
}

export function toughCookieFileStoreToPuppeteerCookie(tcfs: ToughCookieFileStore): SetCookie[] {
  const puppetCookies: SetCookie[] = [];
  Object.values(tcfs).forEach(domain => {
    Object.values(domain).forEach(path => {
      Object.values(path).forEach(tcfsCookie => {
        puppetCookies.push({
          name: tcfsCookie.key,
          value: tcfsCookie.value,
          expires: tcfsCookie.expires ? new Date(tcfsCookie.expires).getTime() / 1000 : undefined,
          domain: `${!tcfsCookie.hostOnly ? '.' : ''}${tcfsCookie.domain}`,
          path: tcfsCookie.path,
          secure: tcfsCookie.secure,
          httpOnly: tcfsCookie.httpOnly,
          sameSite: 'Lax',
        });
      });
    });
  });
  return puppetCookies;
}

export function getDevtoolsUrl(page: Page): string {
  // eslint-disable-next-line no-underscore-dangle
  const targetId = (page as any)._target._targetId as string;
  const wsEndpoint = new URL(page.browser().wsEndpoint());
  // devtools://devtools/bundled/inspector.html?ws=127.0.0.1:35871/devtools/page/2B4E5714B42640A1C61AB9EE7E432730
  return `devtools://devtools/bundled/inspector.html?ws=${wsEndpoint.host}/devtools/page/${targetId}`;
}
