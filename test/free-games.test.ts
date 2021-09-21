import AccountManager from './util/puppet-account';
import { redeemAccount } from '../src';

jest.setTimeout(100000);
describe('Create account and redeem free games', () => {
  describe('US-based account', () => {
    const account = new AccountManager({ country: 'United States' });

    afterAll(async () => {
      await account.deleteAccount();
      account.logAccountDetails();
    });

    it('should create an account', async () => {
      await account.createAccount();
      expect(account.username).toBeDefined();
      expect(account.email).toBeDefined();
      expect(account.password).toBeDefined();
      account.logAccountDetails();
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

  describe('EU-based account', () => {
    const account = new AccountManager({ country: 'Germany' });

    afterAll(async () => {
      await account.deleteAccount();
      account.logAccountDetails();
    });

    it('should create an account', async () => {
      await account.createAccount();
      expect(account.username).toBeDefined();
      expect(account.email).toBeDefined();
      expect(account.password).toBeDefined();
      account.logAccountDetails();
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

  describe('UK-based account', () => {
    const account = new AccountManager({ country: 'United Kingdom' });

    afterAll(async () => {
      await account.deleteAccount();
      account.logAccountDetails();
    });

    it('should create an account', async () => {
      await account.createAccount();
      expect(account.username).toBeDefined();
      expect(account.email).toBeDefined();
      expect(account.password).toBeDefined();
      account.logAccountDetails();
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

  describe('Russia-based account', () => {
    const account = new AccountManager({ country: 'Russia' });

    afterAll(async () => {
      await account.deleteAccount();
      account.logAccountDetails();
    });

    it('should create an account', async () => {
      await account.createAccount();
      expect(account.username).toBeDefined();
      expect(account.email).toBeDefined();
      expect(account.password).toBeDefined();
      account.logAccountDetails();
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
