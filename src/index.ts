/* eslint-disable no-await-in-loop */
import 'source-map-support/register';
import { config } from './common/config';
import L from './common/logger';
import Login from './login';
import FreeGames from './free-games';
import Purchase from './purchase';
import { newCookieJar } from './common/request';
import './site/app';

async function main(): Promise<void> {
  const accountPromises = config.accounts.map(async account => {
    L.info(`Checking free games for ${account.email}`);
    try {
      const requestClient = newCookieJar(account.email);
      const login = new Login(requestClient, account.email);
      const freeGames = new FreeGames(requestClient, account.email);
      const purchase = new Purchase(requestClient, account.email);
      await login.fullLogin(account.email, account.password, account.totp); // Login
      const offers = await freeGames.getAllFreeGames(); // Get purchasable offers
      await purchase.purchaseGames(offers); // Purchase games
    } catch (e) {
      if (e.response) {
        if (e.response.body) L.error(e.response.body);
        else L.error(e.response);
      }
      L.error(e);
    }
  });
  await Promise.all(accountPromises);
}

main();
