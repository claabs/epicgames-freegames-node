import { Got } from 'got';
import AccountManager from './util/account';
import FreeGames from '../src/free-games';
import Login from '../src/login';
import { OfferInfo } from '../src/interfaces/types';
import Purchase from '../src/purchase';
import { deleteCookies, newCookieJar } from '../src/common/request';

jest.setTimeout(100000);
describe('Create account and redeem free games', () => {
  let account: AccountManager;
  let request: Got;

  it('should create an account', async () => {
    account = new AccountManager();
    await expect(account.init()).resolves.not.toThrowError();
    request = newCookieJar(account.permMailAddress);
  });

  it('should login fresh', async () => {
    deleteCookies(account.permMailAddress);
    const login = new Login(request, account.permMailAddress);
    await expect(
      login.fullLogin(account.permMailAddress, account.password, account.totp)
    ).resolves.not.toThrowError();
  });

  it('should refresh login', async () => {
    const login = new Login(request, account.permMailAddress);
    await expect(
      login.fullLogin(account.permMailAddress, account.password, account.totp)
    ).resolves.not.toThrowError();
  });

  let offers: OfferInfo[];
  it('should find available games', async () => {
    const freeGames = new FreeGames(request, account.permMailAddress);
    offers = await freeGames.getAllFreeGames();
    expect(offers.length).toBeGreaterThan(0);
  });

  it('should purchase games', async () => {
    const purchase = new Purchase(request, account.permMailAddress);
    await expect(purchase.purchaseGames(offers)).resolves.not.toThrowError();
  });
});
