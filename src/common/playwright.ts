import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import filenamify from 'filenamify';
import fsx, { ensureDir } from 'fs-extra/esm';
import { chromium } from 'patchright';
import psList from 'ps-list';

import { getCommitSha } from '../version.js';
import { config } from './config/index.js';

import type { BrowserContext, Page } from 'patchright';
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

export const killBrowserProcesses = async (L: Logger): Promise<void> => {
  if (!getCommitSha()) return; // Don't kill processes if not in docker
  const runningProcesses = await psList();
  L.trace({ runningProcesses }, 'Currently running processes');
  const chromiumProcessNames = ['chromium', 'chrome', 'headless_shell'];
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

export const cleanupTempFiles = async (L: Logger): Promise<void> => {
  if (!getCommitSha()) return; // Don't clear if not in docker
  const tempDir = os.tmpdir();
  const tempFiles = await fs.readdir(tempDir);
  const profileMatcher = /^puppeteer_dev_profile-\w+$/;
  const devProfiles = tempFiles.filter((file) => profileMatcher.test(file));
  const chromiumMatcher = /^\.org\.chromium\.Chromium\.\w+$/;
  const chromiumTempfiles = tempFiles.filter((file) => chromiumMatcher.test(file));
  const deletedFiles = [...devProfiles, ...chromiumTempfiles];
  L.debug({ deletedFiles }, 'Deleting temp puppeteer dev profile and chromium folders');
  await Promise.all(
    deletedFiles.map(async (file) => {
      try {
        await fsx.remove(path.join(tempDir, file));
      } catch (err) {
        L.warn({ file, err }, 'Unable to delete folder');
      }
    }),
  );
};

/**
 * Create a new page within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeNewPage = async (browser: BrowserContext, L: Logger): Promise<Page> => {
  L.debug('Launching a new page');
  const page = await browser.newPage();
  page.setDefaultTimeout(config.browserNavigationTimeout);
  return page;
};

/**
 * Launch a new browser within a wrapper that will retry if it hangs for 30 seconds
 */
export const safeLaunchBrowser = async (L: Logger, account: string): Promise<BrowserContext> => {
  L.debug('Launching a new browser');
  const userDir = path.join(config.usersDir, filenamify(account));
  await ensureDir(userDir);
  await fsx.remove(path.join(userDir, 'SingletonCookie'));
  await fsx.remove(path.join(userDir, 'SingletonLock'));
  await fsx.remove(path.join(userDir, 'SingletonSocket'));
  return chromium.launchPersistentContext(userDir, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    ...getPlaywrightProxyConfig(),
    // args: [
    //   '--disable-dev-shm-usage',
    //   '--disable-background-networking',
    //   '--disable-sync',
    //   '--disable-default-apps',
    //   '--no-first-run',
    // ],
  });
};
