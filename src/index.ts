/* eslint-disable no-await-in-loop */
import 'source-map-support/register';
import { config } from './common/config';
import L from './common/logger';
import Login from './login';
import FreeGames from './free-games';
import Purchase from './purchase';
import { newCookieJar } from './common/request';
import PuppetPurchase from './puppet/purchase';

async function main(): Promise<void> {
  const accountPromises = config.accounts.map(async (account, index) => {
    await new Promise(resolve => setTimeout(resolve, index * (config.intervalTime || 60) * 1000));
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
        L.info(`Purchasing ${offers[i].productName}`);
        // Async for-loop as running purchases in parallel may break
        try {
          await purchase.purchase(offers[i].offerNamespace, offers[i].offerId);
        } catch (err) {
          L.warn(err);
          L.warn('API purchase experienced an error, trying puppeteer purchase');
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
    }
  });
  await Promise.all(accountPromises);
  // process.exit(); // necessary due to express server running
}

main().catch(err => L.error(err));
