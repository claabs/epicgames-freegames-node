import puppeteer from '../src/common/puppeteer';
import { NotificationReason } from '../src/interfaces/notification-reason';
import { sendNotification } from '../src/notify';

jest.setTimeout(1000000);
describe('Create account and redeem free games', () => {
  it('should open a portal and notify', async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
    });
    const page = await browser.newPage();
    await page.goto('https://google.com');
    const url = await page.openPortal();
    await sendNotification(url, 'test', NotificationReason.LOGIN);
    const resp = await page.waitForNavigation({ timeout: 1000000 });
    expect(resp).toBeDefined();
  });
});
