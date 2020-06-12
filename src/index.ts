/* eslint-disable no-await-in-loop */
import 'source-map-support/register';
import { config } from './common/config';
import L from './common/logger';
import { fullLogin } from './login';
import { getAllFreeGames } from './free-games';
import { purchaseGames } from './purchase';
import request from './common/request';

async function main(): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax
  for (const account of config.accounts) {
    L.info(`Checking free games for ${account.email}`);
    try {
      request.newCookieJar(account.email);
      await fullLogin(account.email, account.password, account.totp); // Login
      const offers = await getAllFreeGames(); // Get purchasable offers
      await purchaseGames(offers); // Purchase games
    } catch (e) {
      if (e.response) {
        if (e.response.body) L.error(e.response.body);
        else L.error(e.response);
      }
      L.error(e);
    }
  }
}

main();
