import fs from 'node:fs';
import { access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import filenamify from 'filenamify';
import fsx, { ensureDir } from 'fs-extra/esm';
import pTimeout, { TimeoutError } from 'p-timeout';
import { chromium } from 'patchright';
import psList from 'ps-list';

import { getCommitSha } from '../version.ts';
import { config } from './config/index.ts';

import type { BrowserContext, BrowserType, Page } from 'patchright';
import type { Logger } from 'pino';

export default chromium;

const getProxyEnvironmentVariable = (name: string): string | undefined =>
  [process.env[name.toLowerCase()], process.env[name.toUpperCase()]].find(Boolean);

const getPlaywrightProxyConfig = () => {
  const proxyString =
    getProxyEnvironmentVariable('https_proxy') ?? getProxyEnvironmentVariable('all_proxy');
  if (proxyString) {
    return {
      proxy: {
        server: proxyString,
      },
    };
  }
  return {};
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
  try {
    return await pTimeout(f(), { milliseconds: TIMEOUT });
  } catch (err) {
    if (!(err instanceof TimeoutError)) {
      throw err;
    }
    if (attempts >= MAX_ATTEMPTS) {
      L.error(
        `If not already, consider using the Debian (:debian) version of the image. More: https://github.com/claabs/epicgames-freegames-node#docker-configuration`,
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

export const killBrowserProcesses = async (L: Logger): Promise<void> => {
  if (!getCommitSha()) return; // Don't kill processes if not in docker
  const runningProcesses = await psList();
  L.trace({ runningProcesses }, 'Currently running processes');
  const chromiumProcessNames = ['chrome'];
  const browserProcesses = runningProcesses.filter((p) =>
    chromiumProcessNames.some((n) => p.cmd?.includes(n)),
  );
  const processNames = browserProcesses
    .map((p) => {
      if (!p.cmd) return '';
      const processName = /\s(\/.*?(chromium|chome|headless_shell).*?)\s/.exec(p.cmd)?.[1];
      return processName;
    })
    .filter((name): name is string => typeof name === 'string');
  L.debug({ processNames }, 'Killing dangling browser processes');
  browserProcesses.forEach((p) => {
    try {
      process.kill(p.pid);
    } catch (err) {
      L.warn({ pid: p.pid, name: p.name, err }, 'Unable to kill process');
    }
  });
};

/**
 * Create a new page within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeNewPage = async (browser: BrowserContext, L: Logger): Promise<Page> => {
  L.debug('Launching a new page');
  const page = await retryFunction(async () => browser.newPage(), L, 'new page');
  page.setDefaultTimeout(config.browserNavigationTimeout);
  return page;
};

/**
 * Launch a new browser within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeLaunchBrowser = async (L: Logger, account: string): Promise<BrowserContext> => {
  L.debug('Launching a new browser');
  const userDir = path.join(config.usersDir, filenamify(account));

  try {
    await ensureDir(userDir);
    await access(userDir, fs.constants.W_OK);
  } catch (err) {
    L.error(
      err,
      `Unable to write to ${userDir} to save browser profiles. Fix the permissions and restart.`,
    );
    throw err;
  }

  await fsx.remove(path.join(userDir, 'SingletonCookie'));
  await fsx.remove(path.join(userDir, 'SingletonLock'));
  await fsx.remove(path.join(userDir, 'SingletonSocket'));
  const launchArgs: Parameters<BrowserType['launchPersistentContext']>[1] = {
    channel: os.arch() === 'arm64' ? 'chromium' : 'chrome',
    headless: false,
    viewport: null,
    ...getPlaywrightProxyConfig(),
  };
  return retryFunction(
    async () => chromium.launchPersistentContext(userDir, launchArgs),
    L,
    'browser launch',
  );
};
