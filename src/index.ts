import 'source-map-support/register';
import { scheduleJob } from 'node-schedule';
import { config } from './common/config';
import L from './common/logger';
import { fullLogin } from './login';
import { getAllFreeGames } from './free-games';
import { purchaseGames } from './purchase';

async function main(): Promise<void> {
  try {
    await fullLogin(); // Login
    const offers = await getAllFreeGames(); // Get purchasable offers
    await purchaseGames(offers); // Purchase games
  } catch (e) {
    if (e.response && e.response.body) {
      L.error(e.response.body);
    }
    L.error(e);
  }
}

if (config.runOnStartup) main();

const cronTime = config.cronSchedule;
scheduleJob(cronTime, async () => main());
