/* eslint-disable no-console */
import * as cookieParser from 'set-cookie-parser';
import { config } from 'dotenv';
import { JSDOM } from 'jsdom';
import axios from './axios';
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
import { getCaptchaSessionToken } from './captcha';

config();

const CSRF_ENDPOINT = 'https://www.epicgames.com/id/api/csrf';
const LOGIN_ENDPOINT = 'https://www.epicgames.com/id/api/login';
const GRAPHQL_ENDPOINT = 'https://graphql.epicgames.com/graphql';

const EPIC_CLIENT_ID = '875a3b57d3a640a6b7f9b4e883463ab4';
const EPIC_ARKOSE_PUBLIC_KEY = '37D033EB-6489-3763-2AE1-A228C04103F5';
const EPIC_ARKOSE_BASE_URL = 'https://epic-games-api.arkoselabs.com';

const EMAIL = process.env.EMAIL || 'missing@email.com';
const PASSWORD = process.env.PASSWORD || 'missing-password';

async function login(
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
      const captchaToken = await getCaptchaSessionToken();
      await login(email, password, captchaToken, attempt + 1, totp);
      // TODO: We have some options here:
      // 1. Provide web portal that the user can solve the captcha in
      // 2. Just provide a link to the NoJS captcha page and have the use paste in the session token in a console
      // 3. Use the image-based FunCaptcha solver project https://github.com/dmartingarcia/funcaptcha-solver
      // 4. Use Google voice to text service on audio-based FunCaptcha. You get 60 minutes of audio transcription for free. Each user would provide their own token.
    } else {
      console.error('LOGIN FAILED:', e.response.data.errorCode);
      throw e;
    }
  }
}

async function setupSid(): Promise<string> {
  const clientId = '875a3b57d3a640a6b7f9b4e883463ab4';

  const redirectResp = await axios.get<RedirectResponse>(
    'https://www.epicgames.com/id/api/redirect',
    {
      params: {
        clientId,
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

async function purchase(
  linkedOfferNs: string,
  linkedOfferId: string,
  sessionId: string
): Promise<void> {
  const purchasePageResp = await axios.get<string>('https://www.epicgames.com/store/purchase', {
    params: {
      namespace: linkedOfferNs,
      offers: linkedOfferId,
    },
  });
  const purchaseDocument = new JSDOM(purchasePageResp.data).window.document;
  let purchaseToken = '';
  const purchaseTokenInput = purchaseDocument.querySelector('#purchaseToken');
  if (purchaseTokenInput && purchaseTokenInput.nodeValue) {
    purchaseToken = purchaseTokenInput.nodeValue;
  }

  // TODO: Is this necessary???
  await axios.get('https://payment-website-pci.ol.epicgames.com/purchase/safetech', {
    params: {
      s: sessionId,
    },
  });

  // TODO: Pretty sure this isn't necessary
  // await axios.get('https://payment-website-pci.ol.epicgames.com/purchase/payment-methods', {
  //   params: {
  //     isOrderRequest: 1,
  //     namespace: linkedOfferNs,
  //   },
  //   headers: {
  //     'x-requested-with': purchaseToken,
  //   },
  // });

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

  const orderPreviewResp = await axios.post<OrderPreviewResponse>(
    'https://payment-website-pci.ol.epicgames.com/purchase/order-preview',
    orderPreviewRequest,
    {
      headers: {
        'x-requested-with': purchaseToken,
      },
    }
  );

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
}

async function getFreeGames(): Promise<OfferElement[]> {
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
  const productInfoResp = await axios.get<ProductInfo>(
    `https://www.epicgames.com/store/en-US/api/content/products/${productSlug}`
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
      return ownsGames[index];
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

async function main(): Promise<void> {
  try {
    // Login
    await login(EMAIL, PASSWORD);
    // Setup SID
    const sessionId = await setupSid();
    const validFreeGames = await getFreeGames();
    const purchasableGames = await getPurchasableFreeGames(validFreeGames);
    for (let i = 0; i < purchasableGames.length; i += 1) {
      console.log(`Purchasing ${purchasableGames[i].productName}`);
      // eslint-disable-next-line no-await-in-loop
      await purchase(purchasableGames[i].offerNamespace, purchasableGames[i].offerId, sessionId);
    }
  } catch (e) {
    console.error(e);
  }
}

main();
