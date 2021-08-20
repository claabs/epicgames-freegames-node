import puppeteer from 'puppeteer-extra';
import PortalPlugin from 'puppeteer-extra-plugin-portal';

puppeteer.use(
  PortalPlugin({
    // This is a typical configuration when hosting behind a secured reverse proxy
    webPortalConfig: {
      listenOpts: {
        port: 3000,
      },
      baseUrl: 'https://portal.example.com',
    },
    webSocketConfig: {
      port: 3001,
      baseUrl: 'wss://devtools.example.com',
    },
  })
);

export default puppeteer;
