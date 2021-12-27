import puppeteer from 'puppeteer-extra';
import { Page, Protocol, Browser } from 'puppeteer';
import PortalPlugin, { WebPortalConnectionConfig } from 'puppeteer-extra-plugin-portal';
import objectAssignDeep from 'object-assign-deep';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Logger } from 'pino';
import { cancelable } from 'cancelable-promise';
import { ToughCookieFileStore } from './request';
import { config } from './config';

const defaultWebPortalConfig: WebPortalConnectionConfig = {
  baseUrl: 'http://localhost:3000',
  listenOpts: {
    port: 3000,
  },
};

puppeteer.use(
  PortalPlugin({
    webPortalConfig: objectAssignDeep(defaultWebPortalConfig, config.webPortalConfig),
  })
);

puppeteer.use(StealthPlugin());

export default puppeteer;

export function puppeteerCookieToToughCookieFileStore(
  puppetCookie: Protocol.Network.Cookie
): ToughCookieFileStore {
  const domain = puppetCookie.domain.replace(/^\./, '');
  const expires = new Date(puppetCookie.expires * 1000).toISOString();
  const { path, name } = puppetCookie;

  const tcfsCookie: ToughCookieFileStore = {
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
  return tcfsCookie;
}

export function puppeteerCookiesToToughCookieFileStore(
  puppetCookies: Protocol.Network.Cookie[]
): ToughCookieFileStore {
  const tcfs: ToughCookieFileStore = {};
  puppetCookies.forEach((puppetCookie) => {
    const temp = puppeteerCookieToToughCookieFileStore(puppetCookie);
    objectAssignDeep(tcfs, temp);
  });
  return tcfs;
}

export function toughCookieFileStoreToPuppeteerCookie(
  tcfs: ToughCookieFileStore
): Protocol.Network.CookieParam[] {
  const puppetCookies: Protocol.Network.CookieParam[] = [];
  Object.values(tcfs).forEach((domain) => {
    Object.values(domain).forEach((path) => {
      Object.values(path).forEach((tcfsCookie) => {
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
  // eslint-disable-next-line no-underscore-dangle,@typescript-eslint/no-explicit-any
  const targetId: string = (page.target() as any)._targetId;
  const wsEndpoint = new URL(page.browser().wsEndpoint());
  // devtools://devtools/bundled/inspector.html?ws=127.0.0.1:35871/devtools/page/2B4E5714B42640A1C61AB9EE7E432730
  return `devtools://devtools/bundled/inspector.html?ws=${wsEndpoint.host}/devtools/page/${targetId}`;
}

export const launchArgs: Parameters<typeof puppeteer.launch>[0] = {
  headless: true,
  args: [
    '--disable-web-security', // For accessing iframes
    '--disable-features=IsolateOrigins,site-per-process', // For accessing iframes
    '--no-sandbox', // For Docker root user
    '--disable-dev-shm-usage', // https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
    '--no-zygote', // https://github.com/puppeteer/puppeteer/issues/1825#issuecomment-636478077
    '--single-process',
    // For debugging in Docker
    // '--remote-debugging-port=3001',
    // '--remote-debugging-address=0.0.0.0', // Change devtools url to localhost
  ],
};

/**
 * This is a hacky solution to retry a function if it doesn't return within a timeout.
 * It leaves behind a danging chromium process, but it should get cleaned up when this parent node
 * process exits if the container is using tini.
 */
const retryFunction = async <T>(
  f: () => Promise<T>,
  L: Logger,
  outputName: string,
  attempts = 0
): Promise<T> => {
  const TIMEOUT = 30 * 1000;
  const MAX_ATTEMPTS = 30;
  const newPageCancelable = cancelable(f());
  const res = await Promise.race([
    newPageCancelable,
    // eslint-disable-next-line no-promise-executor-return
    new Promise((resolve) => setTimeout(resolve, TIMEOUT)).then(() => 'timeout'),
  ]);
  if (typeof res !== 'string') {
    return res;
  }
  newPageCancelable.cancel();
  if (attempts > MAX_ATTEMPTS)
    throw new Error(`Could not do ${outputName} after ${MAX_ATTEMPTS} attempts.`);
  L.debug(
    { attempts, MAX_ATTEMPTS },
    `${outputName} did not work after ${TIMEOUT}ms. Trying again.`
  );
  return retryFunction(f, L, outputName, attempts + 1);
};

/**
 * Create a new page within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeNewPage = (browser: Browser, L: Logger): Promise<Page> => {
  return retryFunction(() => browser.newPage(), L, 'new page');
};

/**
 * Launcha new browser within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeLaunchBrowser = (L: Logger): Promise<Browser> => {
  return retryFunction(() => puppeteer.launch(launchArgs), L, 'browser launch');
};
