import AccountManager from './util/puppet-account';
import { redeemAccount } from '../src';

jest.setTimeout(100000);
describe('Create account and redeem free games', () => {
  describe('US-based account', () => {
    const account = new AccountManager({ country: 'United States' });

    it('should create an account', async () => {
      await account.createAccount();
      expect(account.username).toBeDefined();
      expect(account.email).toBeDefined();
      expect(account.password).toBeDefined();
    });

    it('should redeem available free games', async () => {
      await expect(
        redeemAccount(
          {
            email: account.email,
            password: account.email,
            totp: account.totp,
          },
          0
        )
      ).resolves.not.toThrow();
    });
    account.logAccountDetails();
  });
});
