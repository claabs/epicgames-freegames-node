/* eslint-disable no-console */
import * as cookieParser from 'set-cookie-parser';
import { config } from 'dotenv';
import axios from './axios';
import {
  CSRFSetCookies,
  LoginBody,
  GraphQLBody,
  FreegamesResponse,
  RedirectResponse,
  OrderPreviewResponse,
} from './types';

config();

const CSRF_ENDPOINT = 'https://www.epicgames.com/id/api/csrf';
const LOGIN_ENDPOINT = 'https://www.epicgames.com/id/api/login';
const GRAPHQL_ENDPOINT = 'https://graphql.epicgames.com/graphql';

const EMAIL = process.env.EMAIL || 'missing@email.com';
const PASSWORD = process.env.PASSWORD || 'missing-password';

async function login(email: string, password: string, totp: string): Promise<void> {
  const csrfResp = await axios.get(CSRF_ENDPOINT);
  const cookies = (cookieParser(csrfResp.headers['set-cookie'], {
    map: true,
  }) as unknown) as CSRFSetCookies;
  const csrfToken = cookies['XSRF-TOKEN'].value;

  const loginBody: LoginBody = {
    password,
    rememberMe: false,
    captcha: '',
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
      await login(email, password, totp);
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
  //  Get purchase token
  //  Safetech
  //  Order Preview
  //  Confirm Order
  const purchasePageResp = await axios.get<Document>('https://www.epicgames.com/store/purchase', {
    params: {
      namespace: linkedOfferNs,
      offers: linkedOfferId,
    },
  });
  let purchaseToken = '';
  const purchaseTokenInput = purchasePageResp.data.querySelector('#purchaseToken');
  if (purchaseTokenInput && purchaseTokenInput.nodeValue) {
    purchaseToken = purchaseTokenInput.nodeValue;
  }

  await axios.get('https://payment-website-pci.ol.epicgames.com/purchase/safetech', {
    params: {
      s: sessionId,
    },
  });

  await axios.get('https://payment-website-pci.ol.epicgames.com/purchase/payment-methods', {
    params: {
      isOrderRequest: 1,
      namespace: linkedOfferNs,
    },
    headers: {
      'x-requested-with': purchaseToken,
    },
  });

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

async function getFreeGames(): Promise<FreegamesResponse> {
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
  let resp;
  try {
    resp = await axios.post<FreegamesResponse>(GRAPHQL_ENDPOINT, data);
  } catch (e) {
    console.error(e.response.data);
    throw e;
  }
  return resp.data;
}

async function main(): Promise<void> {
  try {
    // Login
    await login(EMAIL, PASSWORD, '');
    // Setup SID
    const sessionId = await setupSid();
    // Get list of free games to purchase
    // For each game to purchase
    await purchase(
      'f9c2aedaff8442b286fbd026948b9f09',
      'a141915f0de3494791151b205a712cda',
      sessionId
    );
  } catch (e) {
    console.error(e);
  }
}

main();
