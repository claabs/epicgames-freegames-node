import AccountManager from './util/account';
import { getAllFreeGames } from '../src/free-games';

jest.setTimeout(100000);
// describe('Create account and redeem free games', () => {
// let account: AccountManager;
// beforeAll(async () => {
//   account = new AccountManager();
//   await account.init();
// });

// afterAll(async () => {});

//   it('should create an account', async () => {
//     await expect(getAllFreeGames()).resolves.not.toThrowError();
//   });
// });

describe('All APIs should be working', () => {
  it('should call the promotions GraphQL API', async () => {
    const freeGames = await getAllFreeGames();
    expect(freeGames).toBeInstanceOf(Array);
  });
});
