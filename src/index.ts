/* eslint-disable no-await-in-loop */
import 'source-map-support/register';
import { exit } from 'process';
import { config, AccountConfig } from './common/config';
import L from './common/logger';
import Login from './login';
import FreeGames from './free-games';
import Purchase from './purchase';
import { newCookieJar } from './common/request';
import PuppetPurchase from './puppet/purchase';
import { testNotifiers } from './notify';
import { checkForUpdate, logVersionOnError } from './version';

export async function redeemAccount(account: AccountConfig, index: number): Promise<void> {
  const waitTime = index * config.intervalTime * 1000;
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, waitTime));
  L.info(`Checking free games for ${account.email} `);
  try {
    const requestClient = newCookieJar(account.email);
    const login = new Login(requestClient, account.email);
    const freeGames = new FreeGames(requestClient, account.email);
    const purchase = new Purchase(requestClient, account.email);
    const purchasePuppeteer = new PuppetPurchase(account.email);
    await login.fullLogin(account.email, account.password, account.totp); // Login
    const offers = await freeGames.getAllFreeGames(); // Get purchasable offers
    for (let i = 0; i < offers.length; i += 1) {
      // Async for-loop as running purchases in parallel may break
      L.info(`Purchasing ${offers[i].productName}`);
      let { puppeteerPurchase } = config;
      try {
        if (!puppeteerPurchase) {
          await purchase.purchase(
            offers[i].offerNamespace,
            offers[i].offerId,
            offers[i].productName
          );
        }
      } catch (err) {
        L.warn(err);
        L.warn('API purchase experienced an error, trying puppeteer purchase');
        puppeteerPurchase = true;
      }
      if (puppeteerPurchase) {
        await purchasePuppeteer.purchaseShort(offers[i].offerNamespace, offers[i].offerId);
      }
      L.info(`Done purchasing ${offers[i].productName}`);
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
    if (config.testNotifiers) {
      await testNotifiers();
    }
    const accountPromises = config.accounts.map(redeemAccount);
    await Promise.all(accountPromises);
    exit(0); // For some reason, puppeteer will keep a zombie promise alive and stop Node from exiting
  }
}

main().catch((err) => {
  L.error(err);
  logVersionOnError();
  exit(1);
});
