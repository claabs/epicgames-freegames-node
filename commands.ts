// eslint-disable-next-line import/no-extraneous-dependencies
import { Argv, usage } from 'yargs';
import AccountManager from './test/util/puppet-account';
import { newCookieJar } from './src/common/request';

interface ReleaseArgs {
  [x: string]: unknown;
  u: string;
  p: string;
  _: string[];
  $0: string;
}

interface RedeemArgs {
  [x: string]: unknown;
  u?: string;
  p?: string;
  t?: string;
  _: string[];
  $0: string;
}

const createAccount = async (): Promise<void> => {
  const account = new AccountManager();
  await account.createAccount();
};

// const releaseAccount = async (args: ReleaseArgs): Promise<void> => {
//   const account = new AccountManager(args.u, args.p);
//   await account.login();
//   await account.changeEmail();
// };

const redeemGames = async (args: RedeemArgs): Promise<void> => {
  const user = process.env.TEST_USER || args.u;
  const pass = process.env.TEST_PASSWORD || args.p;
  const totp = process.env.TEST_TOTP || args.t;
  // if (!user || !pass || !totp) throw new Error('Missing username, password, or TOTP');
  // const account = new AccountManager(user, pass, totp);
  // await account.login();
  // const requestClient = newCookieJar(user);
  // const freeGames = new FreeGames(requestClient, account.permMailAddress);
  // const purchase = new Purchase(requestClient, account.permMailAddress);
  // const offers = await freeGames.getAllFreeGames(); // Get purchasable offers
  // await purchase.purchaseGames(offers); // Purchase games;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { argv } = usage('$0 <command> [option]')
  .command<RedeemArgs>(
    ['create-account', 'create'],
    'Create a fresh account',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (yargs: any) => {
      return yargs.usage('$0 create-account').usage('$0 create').help();
    },
    createAccount
  )
  .command<RedeemArgs>(
    ['redeem', 'free-games'],
    'Redeem all free games for a user',
    (yargs) =>
      yargs
        .usage('$0 release --username <username> --pasword <password>')
        .option('u', {
          alias: ['user', 'username'],
          type: 'string',
          demandOption: false,
        })
        .option('p', {
          alias: ['pass', 'password'],
          type: 'string',
          demandOption: false,
        })
        .option('t', {
          alias: ['totp', 'mfa'],
          type: 'string',
          demandOption: false,
        })
        .help(),
    redeemGames
  )
  .help()
  .demandCommand();
