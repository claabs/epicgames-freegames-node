import _puppeteer, { PuppeteerExtra } from 'puppeteer-extra';
import { Page, Protocol, Browser, executablePath } from 'puppeteer';
import objectAssignDeep from 'object-assign-deep';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Logger } from 'pino';
import pTimeout, { TimeoutError } from 'p-timeout';
import pidtree from 'pidtree';
import findProcess from 'find-process';
import { ETCCookie, ToughCookieFileStore } from './cookie.js';
import { config } from './config/index.js';

const puppeteer = _puppeteer as unknown as PuppeteerExtra;
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow'); // fixes "word word word..." and "mmMwWLliI0fiflO&1"
puppeteer.use(stealth);

export default puppeteer;

export function puppeteerCookieToToughCookieFileStore(
  puppetCookie: Protocol.Network.Cookie,
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
  puppetCookies: Protocol.Network.Cookie[],
): ToughCookieFileStore {
  const tcfs: ToughCookieFileStore = {};
  puppetCookies.forEach((puppetCookie) => {
    const temp = puppeteerCookieToToughCookieFileStore(puppetCookie);
    objectAssignDeep(tcfs, temp);
  });
  return tcfs;
}

export function toughCookieFileStoreToPuppeteerCookie(
  tcfs: ToughCookieFileStore,
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

export function puppeteerCookieToEditThisCookie(
  puppetCookies: Protocol.Network.CookieParam[],
): ETCCookie[] {
  return puppetCookies.map(
    (puppetCookie, index): ETCCookie => ({
      domain: puppetCookie.domain || '',
      expirationDate: puppetCookie.expires,
      hostOnly: !puppetCookie.domain?.startsWith('.'),
      httpOnly: puppetCookie.httpOnly ?? true,
      name: puppetCookie.name,
      path: puppetCookie.path || '/',
      sameSite: puppetCookie.sameSite === 'Lax' ? 'no_restriction' : 'unspecified',
      secure: puppetCookie.secure ?? false,
      session: puppetCookie.expires === -1,
      storeId: '0',
      id: index + 1,
      value: puppetCookie.value,
    }),
  );
}

export function getDevtoolsUrl(page: Page): string {
  // eslint-disable-next-line no-underscore-dangle,@typescript-eslint/no-explicit-any
  const targetId: string = (page.target() as any)._targetId;
  const wsEndpoint = new URL(page.browser().wsEndpoint());
  // devtools://devtools/bundled/inspector.html?ws=127.0.0.1:35871/devtools/page/2B4E5714B42640A1C61AB9EE7E432730
  return `devtools://devtools/bundled/inspector.html?ws=${wsEndpoint.host}/devtools/page/${targetId}`;
}

export const launchArgs: Parameters<typeof puppeteer.launch>[0] = {
  executablePath: executablePath(),
  headless: true,
  protocolTimeout: 0, // https://github.com/puppeteer/puppeteer/issues/9927
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
 */
const retryFunction = async <T>(
  f: () => Promise<T>,
  L: Logger,
  outputName: string,
  attempts = 0,
): Promise<T> => {
  const TIMEOUT = config.browserLaunchTimeout * 1000;
  const MAX_ATTEMPTS = config.browserLaunchRetryAttempts;
  const beforeProcesses = await pidtree(process.pid);
  try {
    return await pTimeout(f(), { milliseconds: TIMEOUT });
  } catch (err) {
    if (!(err instanceof TimeoutError)) {
      throw err;
    }
    // If the function timed out
    const afterProcesses = await pidtree(process.pid);
    const newProcesses = await Promise.all(
      afterProcesses
        .filter((p) => !beforeProcesses.includes(p))
        .map(async (p) => (await findProcess('pid', p))[0]),
    );
    const chromiumProcesses = newProcesses.filter(
      (p): p is NonNullable<typeof p> =>
        p !== undefined && ['chromium', 'chrome', 'headless_shell'].some((n) => p.name.includes(n)),
    );
    L.debug({ chromiumProcesses }, 'Killing new browser processes spawned');
    chromiumProcesses.forEach((p) => process.kill(p.pid));
    if (attempts >= MAX_ATTEMPTS) {
      L.error(
        `If not already, consider using the Debian (:bullseye-slim) version of the image. More: https://github.com/claabs/epicgames-freegames-node#docker-configuration`,
      );
      throw new Error(`Could not do ${outputName} after ${MAX_ATTEMPTS + 1} failed attempts.`);
    }
    L.warn(
      { attempts, MAX_ATTEMPTS },
      `${outputName} did not work after ${TIMEOUT}ms. Trying again.`,
    );
    return retryFunction(f, L, outputName, attempts + 1);
  }
};

/**
 * Create a new page within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeNewPage = async (browser: Browser, L: Logger): Promise<Page> => {
  L.debug('Launching a new page');
  const page = await retryFunction(() => browser.newPage(), L, 'new page');
  page.setDefaultTimeout(config.browserNavigationTimeout);
  return page;
};

/**
 * Launcha new browser within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeLaunchBrowser = (L: Logger): Promise<Browser> => {
  L.debug('Launching a new browser');
  return retryFunction(() => puppeteer.launch(launchArgs), L, 'browser launch');
};
