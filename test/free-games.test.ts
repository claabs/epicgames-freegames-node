import AccountManager from './util/account';
import { getAllFreeGames } from '../src/free-games';
import { fullLogin } from '../src/login';
import { OfferInfo } from '../src/interfaces/types';
import { purchaseGames } from '../src/purchase';
import request from '../src/common/request';

jest.setTimeout(100000);
describe('Create account and redeem free games', () => {
  let account: AccountManager;

  it('should create an account', async () => {
    account = new AccountManager();
    await expect(account.init()).resolves.not.toThrowError();
  });

  it('should login fresh', async () => {
    request.deleteCookies(account.username);
    await expect(
      fullLogin(account.permMailAddress, account.password, account.totp)
    ).resolves.not.toThrowError();
  });

  it('should refresh login', async () => {
    await expect(
      fullLogin(account.permMailAddress, account.password, account.totp)
    ).resolves.not.toThrowError();
  });

  let offers: OfferInfo[];
  it('should find available games', async () => {
    offers = await getAllFreeGames();
    expect(offers.length).toBeGreaterThan(0);
  });

  it('should purchase games', async () => {
    await expect(purchaseGames(offers)).resolves.not.toThrowError();
  });
});
