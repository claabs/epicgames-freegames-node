import { usage } from 'yargs';
import AccountManager from './test/util/account';
import { getAllFreeGames } from './src/free-games';
import { purchaseGames } from './src/purchase';

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
  await account.init();
};

const releaseAccount = async (args: ReleaseArgs): Promise<void> => {
  const account = new AccountManager(args.u, args.p);
  await account.login();
  await account.changeEmail();
};

const redeemGames = async (args: RedeemArgs): Promise<void> => {
  const user = process.env.TEST_USER || args.u;
  const pass = process.env.TEST_PASSWORD || args.p;
  const totp = process.env.TEST_TOTP || args.t;
  if (!user || !pass || !totp) throw new Error('Missing username, password, or TOTP');
  const account = new AccountManager(user, pass, totp);
  await account.login();
  const offers = await getAllFreeGames(); // Get purchasable offers
  await purchaseGames(offers); // Purchase games;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { argv } = usage('$0 <command> [option]')
  .command(
    ['create-account', 'create'],
    'Create a fresh account',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (yargs: any) => {
      return yargs
        .usage('$0 create-account')
        .usage('$0 create')
        .help();
    },
    createAccount
  )
  .command(
    ['release-account', 'remove', 'release'],
    'Remove an account by its login',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (yargs: any) => {
      return yargs
        .usage('$0 release --username <username> --pasword <password>')
        .option('u', {
          alias: ['user', 'username'],
          type: 'string',
          demandOption: true,
        })
        .option('p', {
          alias: ['pass', 'password'],
          type: 'string',
          demandOption: true,
        })
        .help();
    },
    releaseAccount
  )
  .command(
    ['redeem', 'free-games'],
    'Redeem all free games for a user',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (yargs: any) => {
      return yargs
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
        .help();
    },
    redeemGames
  )
  .help()
  .demandCommand();
