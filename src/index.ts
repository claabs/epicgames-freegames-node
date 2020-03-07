/* eslint-disable no-console */
import * as cookieParser from 'set-cookie-parser';
import { config } from 'dotenv';
import { JSDOM } from 'jsdom';
import { scheduleJob } from 'node-schedule';
import axios from './common/axios';
import {
  CSRFSetCookies,
  LoginBody,
  GraphQLBody,
  RedirectResponse,
  OrderPreviewResponse,
  OfferInfo,
} from './types';
import { PromotionsQueryResponse, OfferElement } from './interfaces/promotions-response';
import { ProductInfo } from './interfaces/product-info';
import { getCaptchaSessionToken, EpicArkosePublicKey } from './captcha';

config();

const CSRF_ENDPOINT = 'https://www.epicgames.com/id/api/csrf';
const LOGIN_ENDPOINT = 'https://www.epicgames.com/id/api/login';
const GRAPHQL_ENDPOINT = 'https://graphql.epicgames.com/graphql';

const EPIC_CLIENT_ID = '875a3b57d3a640a6b7f9b4e883463ab4';

const EMAIL = process.env.EMAIL || 'missing@email.com';
const PASSWORD = process.env.PASSWORD || 'missing-password';

export async function login(
  email: string,
  password: string,
  captcha = '',
  attempt = 0,
  totp?: string
): Promise<void> {
  const csrfResp = await axios.get(CSRF_ENDPOINT);
  const cookies = (cookieParser(csrfResp.headers['set-cookie'], {
    map: true,
  }) as unknown) as CSRFSetCookies;
  const csrfToken = cookies['XSRF-TOKEN'].value;
  if (attempt > 5) {
    throw new Error('Too many login attempts');
  }

  const loginBody: LoginBody = {
    password,
    rememberMe: false,
    captcha,
    email,
  };
  try {
    await axios.post(LOGIN_ENDPOINT, loginBody, {
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
    console.log('LOGGED IN!');
  } catch (e) {
    if (e.response.data.errorCode === 'errors.com.epicgames.accountportal.session_invalidated') {
      console.log('Session invalidated, retrying');
      await login(email, password, captcha, attempt + 1, totp);
    } else if (e.response.data.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid') {
      console.warn('Captcha required');
      const captchaToken = await getCaptchaSessionToken(EpicArkosePublicKey.LOGIN);
      await login(email, password, captchaToken, attempt + 1, totp);
    } else {
      console.error('LOGIN FAILED:', e.response.data.errorCode);
      throw e;
    }
  }
}

export async function setupSid(): Promise<string> {
  const redirectResp = await axios.get<RedirectResponse>(
    'https://www.epicgames.com/id/api/redirect',
    {
      params: {
        EPIC_CLIENT_ID,
      },
    }
  );
  const { sid } = redirectResp.data;
  if (!sid) throw new Error('Sid returned null');
  await axios.get('https://www.unrealengine.com/id/api/set-sid', {
    params: {
      sid,
    },
  });
  return sid;
}

export async function purchase(linkedOfferNs: string, linkedOfferId: string): Promise<void> {
  const purchasePageResp = await axios.get<string>('https://www.epicgames.com/store/purchase', {
    params: {
      namespace: linkedOfferNs,
      offers: linkedOfferId,
    },
  });
  const purchaseDocument = new JSDOM(purchasePageResp.data).window.document;
  let purchaseToken = '';
  const purchaseTokenInput = purchaseDocument.querySelector('#purchaseToken') as HTMLInputElement;
  if (purchaseTokenInput && purchaseTokenInput.value) {
    purchaseToken = purchaseTokenInput.value;
  } else {
    // console.error(purchasePageResp.data);
    throw new Error('Missing purchase token');
  }
  console.debug('purchaseToken', purchaseToken);

  const orderPreviewRequest = {
    useDefault: true,
    setDefault: false,
    namespace: linkedOfferNs,
    country: null,
    countryName: null,
    orderId: null,
    orderComplete: null,
    orderError: null,
    orderPending: null,
    offers: [linkedOfferId],
    offerPrice: '',
  };

  console.debug('order preview request', orderPreviewRequest);
  const orderPreviewResp = await axios.post<OrderPreviewResponse>(
    'https://payment-website-pci.ol.epicgames.com/purchase/order-preview',
    orderPreviewRequest,
    {
      headers: {
        'x-requested-with': purchaseToken,
      },
    }
  );
  console.debug('order preview response', orderPreviewResp.data);

  // TODO: Can probably just use a spread operator here?
  const confirmOrderRequest = {
    useDefault: true,
    setDefault: false,
    namespace: linkedOfferNs,
    country: orderPreviewResp.data.country,
    countryName: orderPreviewResp.data.countryName,
    orderId: orderPreviewResp.data.orderId,
    orderComplete: orderPreviewResp.data.orderComplete,
    orderError: orderPreviewResp.data.orderError,
    orderPending: orderPreviewResp.data.orderPending,
    offers: orderPreviewResp.data.offers,
    includeAccountBalance: false,
    totalAmount: 0,
    affiliateId: '',
    creatorSource: '',
    threeDSToken: '',
    voucherCode: null,
    syncToken: orderPreviewResp.data.syncToken,
    isFreeOrder: false,
  };

  const confirmOrderResp = await axios.post(
    'https://payment-website-pci.ol.epicgames.com/purchase/confirm-order',
    confirmOrderRequest,
    {
      headers: {
        'x-requested-with': purchaseToken,
      },
    }
  );
  console.debug('confirm order response', confirmOrderResp.data);
}

export async function getFreeGames(): Promise<OfferElement[]> {
  const query = `query promotionsQuery($namespace: String!, $country: String!, $locale: String!) {
    Catalog {
      catalogOffers(namespace: $namespace, locale: $locale, params: {category: "freegames", country: $country, sortBy: "effectiveDate", sortDir: "asc"}) {
        elements {
          title
          description
          id
          namespace
          categories {
            path
          }
          linkedOfferNs
          linkedOfferId
          productSlug
          promotions {
            promotionalOffers {
              promotionalOffers {
                startDate
                endDate
              }
            }
          }
        }
      }
    }
  }`;
  const variables = { namespace: 'epic', country: 'US', locale: 'en-US' };
  const data: GraphQLBody = { query, variables };
  const resp = await axios.post<PromotionsQueryResponse>(GRAPHQL_ENDPOINT, data);
  const nowDate = new Date();
  const freeOfferedGames = resp.data.data.Catalog.catalogOffers.elements.filter(offer => {
    let r = false;
    offer.promotions.promotionalOffers.forEach(innerOffers => {
      innerOffers.promotionalOffers.forEach(dates => {
        const startDate = new Date(dates.startDate);
        const endDate = new Date(dates.endDate);
        if (startDate <= nowDate && nowDate <= endDate) {
          r = true;
        }
      });
    });
    return r;
  });

  return freeOfferedGames;
}

// TODO: Parameterize region (en-US). Env var probably
async function ownsGame(
  linkedOfferNs: string,
  linkedOfferId: string,
  productSlug: string
): Promise<boolean> {
  const productName = productSlug.split('/')[0];
  const productInfoResp = await axios.get<ProductInfo>(
    `https://www.epicgames.com/store/en-US/api/content/products/${productName}`
  );
  try {
    const matchedPage = productInfoResp.data.pages.find(page => {
      try {
        const match = page.offer.namespace === linkedOfferNs && page.offer.id === linkedOfferId;
        return match;
      } catch (e) {
        // Inner try catch in case one of the pages is missing fields
        console.log(e);
        return false;
      }
    });
    if (!matchedPage) return false;
    return matchedPage.item.hasItem;
  } catch (e) {
    // Outer try catch in case we get a bogus JSON response
    console.log(e);
    return false;
  }
}

async function getPurchasableFreeGames(validOffers: OfferElement[]): Promise<OfferInfo[]> {
  const ownsGamePromises = validOffers.map(offer => {
    return ownsGame(offer.linkedOfferNs, offer.linkedOfferId, offer.productSlug);
  });
  const ownsGames = await Promise.all(ownsGamePromises);
  const purchasableGames: OfferInfo[] = validOffers
    .filter((offer, index) => {
      return !ownsGames[index];
    })
    .map(offer => {
      return {
        offerNamespace: offer.linkedOfferNs,
        offerId: offer.linkedOfferId,
        productName: offer.title,
      };
    });
  return purchasableGames;
}

export async function getAllFreeGames(): Promise<void> {
  await setupSid();
  const validFreeGames = await getFreeGames();
  const purchasableGames = await getPurchasableFreeGames(validFreeGames);
  for (let i = 0; i < purchasableGames.length; i += 1) {
    console.log(`Purchasing ${purchasableGames[i].productName}`);
    // eslint-disable-next-line no-await-in-loop
    await purchase(purchasableGames[i].offerNamespace, purchasableGames[i].offerId);
    console.log('Done purchasing');
  }
}

async function main(): Promise<void> {
  try {
    // Login
    await login(EMAIL, PASSWORD);
    await getAllFreeGames();
  } catch (e) {
    console.error(e);
  }
}

if (process.env.RUN_ON_STARTUP) main();

const cronTime = process.env.CRON_SCHEDULE || '0 12 * * *';
scheduleJob(cronTime, async () => main());
