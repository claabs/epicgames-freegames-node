import { Got } from 'got';
import FreeGames from '../src/free-games';
import Login from '../src/login';
import { OfferInfo } from '../src/interfaces/types';
import Purchase from '../src/purchase';
import { deleteCookies, newCookieJar } from '../src/common/request';

jest.setTimeout(100000);
describe('Create account and redeem free games', () => {
  const permEmail = process.env.TEST_USER || 'test-email@example.com';
  const password = process.env.TEST_PASSWORD || 'password';
  const totp = process.env.TEST_TOTP || 'TOTP';
  let request: Got;

  beforeAll(async () => {
    request = newCookieJar(permEmail);
  });

  it('should login fresh', async () => {
    deleteCookies(permEmail);
    const login = new Login(request, permEmail);
    await expect(login.fullLogin(permEmail, password, totp)).resolves.not.toThrowError();
  });

  it('should refresh login', async () => {
    const login = new Login(request, permEmail);
    await expect(login.fullLogin(permEmail, password, totp)).resolves.not.toThrowError();
  });

  let offers: OfferInfo[];
  it('should find available games', async () => {
    const freeGames = new FreeGames(request, permEmail);
    offers = await freeGames.getAllFreeGames();
    expect(offers.length).toBeGreaterThan(0);
  });

  it('should find free catalog games', async () => {
    const freeGames = new FreeGames(request, permEmail);
    const catalogFreeGames = await freeGames.getCatalogFreeGames();
    expect(catalogFreeGames.length).toBeGreaterThan(0);
  });

  it('should purchase games', async () => {
    const purchase = new Purchase(request, permEmail);
    await expect(purchase.purchaseGames(offers)).resolves.not.toThrowError();
  });
});
