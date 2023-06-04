/* eslint-disable no-await-in-loop */
import 'source-map-support/register';
import { exit } from 'process';
import PQueue from 'p-queue';
import { config, AccountConfig } from './common/config';
import logger from './common/logger';
import { sendNotification, testNotifiers } from './notify';
import { checkForUpdate, logVersionOnError } from './version';
import PuppetLogin from './puppet/login';
import { safeLaunchBrowser } from './common/puppeteer';
import PuppetFreeGames from './puppet/free-games';
import { createServer } from './common/server';
import { convertImportCookies } from './common/cookie';
import { DeviceLogin } from './device-login';
import { generateCheckoutUrl } from './purchase';
import { NotificationReason } from './interfaces/notification-reason';

export async function redeemAccount(account: AccountConfig): Promise<void> {
  const L = logger.child({ user: account.email });
  L.info(`Checking free games for ${account.email} `);
  try {
    convertImportCookies(account.email);
    const browser = await safeLaunchBrowser(L);
    const cookieLogin = new PuppetLogin({
      email: account.email,
      browser,
    });
    const deviceLogin = new DeviceLogin({
      user: account.email,
    });
    const freeGames = new PuppetFreeGames({
      email: account.email,
      browser,
    });

    // Login
    let successfulLogin = await cookieLogin.refreshCookieLogin();
    if (!successfulLogin) {
      // attempt token refresh
      successfulLogin = await deviceLogin.refreshDeviceAuth();
    }
    if (!successfulLogin) {
      // get new device auth
      await deviceLogin.newDeviceAuthLogin();
    }

    // Get purchasable offers
    const offers = await freeGames.getAllFreeGames();
    L.debug('Closing browser');
    await browser.close();
    L.trace('Browser finished closing');

    if (offers.length) {
      L.debug(`Sending checkout link for ${offers.length} offer(s)`);
      const checkoutUrl = generateCheckoutUrl(offers);
      L.info({ url: checkoutUrl }, 'Dispatching checkout notification');
      await sendNotification(account.email, NotificationReason.PURCHASE, checkoutUrl);
    } else {
      L.info('No free games available');
    }
  } catch (e) {
    if (e.response) {
      if (e.response.body) L.error(e.response.body);
      else L.error(e.response);
    }
    L.error(e);
    logVersionOnError();
  }
}

export async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    await checkForUpdate();
    logger.debug('Starting web server for captcha portals');
    const server = await createServer();
    if (config.testNotifiers) {
      await testNotifiers();
    }
    const queue = new PQueue({
      concurrency: config.accountConcurrency,
      interval: config.intervalTime * 1000,
      intervalCap: 1,
    });
    const accountPromises = config.accounts.map(async (account) =>
      queue.add(() => redeemAccount(account))
    );
    await Promise.all(accountPromises);
    server.close();
    logger.info('Exiting successfully');
    exit(0); // For some reason, puppeteer will keep a zombie promise alive and stop Node from exiting
  }
}

main().catch((err) => {
  logger.error(err);
  logVersionOnError();
  exit(1);
});
