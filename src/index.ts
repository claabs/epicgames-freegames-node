import { config } from 'dotenv';
import { scheduleJob } from 'node-schedule';
import L from './common/logger';
import { fullLogin } from './login';
import { getAllFreeGames } from './free-games';
import { purchaseGames } from './purchase';

config();

async function main(): Promise<void> {
  try {
    await fullLogin(); // Login
    const offers = await getAllFreeGames(); // Get purchasable offers
    await purchaseGames(offers); // Purchase games
  } catch (e) {
    if (e.response.body) {
      L.error(e.response.body);
    }
    L.error(e);
  }
}

if (process.env.RUN_ON_STARTUP) main();

const cronTime = process.env.CRON_SCHEDULE || '0 12 * * *';
scheduleJob(cronTime, async () => main());
