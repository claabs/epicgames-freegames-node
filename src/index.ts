import cookieParser from 'set-cookie-parser';
import { config } from 'dotenv';
import { JSDOM } from 'jsdom';
import { scheduleJob } from 'node-schedule';
import { TOTP } from 'otpauth';
import L from './common/logger';
import request from './common/request';
import {
  CSRFSetCookies,
  LoginBody,
  GraphQLBody,
  RedirectResponse,
  OrderPreviewResponse,
  OfferInfo,
  MFABody,
} from './interfaces/types';
import { PromotionsQueryResponse, OfferElement } from './interfaces/promotions-response';
import { ItemEntitlementResp } from './interfaces/product-info';
import { getCaptchaSessionToken, EpicArkosePublicKey } from './captcha';
import {
  CSRF_ENDPOINT,
  LOGIN_ENDPOINT,
  GRAPHQL_ENDPOINT,
  EPIC_CLIENT_ID,
  REDIRECT_ENDPOINT,
  REPUTATION_ENDPOINT,
} from './common/constants';

config();

const EMAIL = process.env.EMAIL || 'missing@email.com';
const PASSWORD = process.env.PASSWORD || 'missing-password';

export async function getCsrf(): Promise<string> {
  const csrfResp = await request.get(CSRF_ENDPOINT);
  const cookies = (cookieParser(csrfResp.headers['set-cookie'] as string[], {
    map: true,
  }) as unknown) as CSRFSetCookies;
  return cookies['XSRF-TOKEN'].value;
}

export async function getReputation(): Promise<void> {
  await request.get(REPUTATION_ENDPOINT);
}

export async function loginMFA(): Promise<void> {
  L.debug('Logging in with MFA');
  if (!process.env.TOTP) throw new Error('TOTP required for MFA login');
  const totpSecret = process.env.TOTP;
  const csrfToken = await getCsrf();
  const totp = new TOTP({ secret: totpSecret });
  const mfaRequest: MFABody = {
    code: totp.generate(),
    method: 'authenticator',
    rememberDevice: true,
  };
  L.debug({ mfaRequest }, 'MFA Request');
  await request.post('https://www.epicgames.com/id/api/login/mfa', {
    json: mfaRequest,
    headers: {
      'x-xsrf-token': csrfToken,
    },
  });
}

export async function login(
  email: string,
  password: string,
  captcha = '',
  attempt = 0
): Promise<void> {
  const csrfToken = await getCsrf();
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
    await request.post(LOGIN_ENDPOINT, {
      json: loginBody,
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
    L.info('Logged in');
  } catch (e) {
    if (e.response.body.errorCode.includes('session_invalidated')) {
      L.debug('Session invalidated, retrying');
      await login(email, password, captcha, attempt + 1);
    } else if (e.response.body.errorCode === 'errors.com.epicgames.accountportal.captcha_invalid') {
      L.debug('Captcha required');
      const captchaToken = await getCaptchaSessionToken(EpicArkosePublicKey.LOGIN);
      await login(email, password, captchaToken, attempt + 1);
    } else if (
      e.response.body.errorCode === 'errors.com.epicgames.common.two_factor_authentication.required'
    ) {
      await loginMFA();
    } else {
      L.error(e.response.body, 'Login failed');
      throw e;
    }
  }
}

export async function refreshAndSid(error: boolean): Promise<boolean> {
  const csrfToken = await getCsrf();
  const redirectResp = await request.get<RedirectResponse>(REDIRECT_ENDPOINT, {
    headers: {
      'x-xsrf-token': csrfToken,
    },
    searchParams: {
      clientId: EPIC_CLIENT_ID,
      redirectUrl: `https://www.epicgames.com/store/en-US/`,
    },
  });
  const { sid } = redirectResp.body;
  if (!sid) {
    if (error) throw new Error('Sid returned null');
    return false;
  }
  await request.get('https://www.unrealengine.com/id/api/set-sid', {
    searchParams: {
      sid,
    },
  });
  return true;
}

export async function purchase(linkedOfferNs: string, linkedOfferId: string): Promise<void> {
  const purchasePageResp = await request.get('https://www.epicgames.com/store/purchase', {
    searchParams: {
      namespace: linkedOfferNs,
      offers: linkedOfferId,
    },
    responseType: 'text',
  });
  const purchaseDocument = new JSDOM(purchasePageResp.body).window.document;
  let purchaseToken = '';
  const purchaseTokenInput = purchaseDocument.querySelector('#purchaseToken') as HTMLInputElement;
  if (purchaseTokenInput && purchaseTokenInput.value) {
    purchaseToken = purchaseTokenInput.value;
  } else {
    throw new Error('Missing purchase token');
  }
  L.debug({ purchaseToken }, 'purchaseToken');

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

  L.debug({ orderPreviewRequest }, 'Order preview request');
  const orderPreviewResp = await request.post<OrderPreviewResponse>(
    'https://payment-website-pci.ol.epicgames.com/purchase/order-preview',
    {
      json: orderPreviewRequest,
      headers: {
        'x-requested-with': purchaseToken,
      },
    }
  );
  L.debug({ orderPreviewResponse: orderPreviewResp.body }, 'Order preview response');

  // TODO: Can probably just use a spread operator here?
  const confirmOrderRequest = {
    useDefault: true,
    setDefault: false,
    namespace: linkedOfferNs,
    country: orderPreviewResp.body.country,
    countryName: orderPreviewResp.body.countryName,
    orderId: orderPreviewResp.body.orderId,
    orderComplete: orderPreviewResp.body.orderComplete,
    orderError: orderPreviewResp.body.orderError,
    orderPending: orderPreviewResp.body.orderPending,
    offers: orderPreviewResp.body.offers,
    includeAccountBalance: false,
    totalAmount: 0,
    affiliateId: '',
    creatorSource: '',
    threeDSToken: '',
    voucherCode: null,
    syncToken: orderPreviewResp.body.syncToken,
    isFreeOrder: false,
  };
  L.debug({ confirmOrderRequest }, 'Confirm order request');
  const confirmOrderResp = await request.post(
    'https://payment-website-pci.ol.epicgames.com/purchase/confirm-order',
    {
      json: confirmOrderRequest,
      headers: {
        'x-requested-with': purchaseToken,
      },
    }
  );
  L.debug({ confirmOrderResponse: confirmOrderResp.body }, 'confirm order response');
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
                discountSetting {
                  discountType
                  discountPercentage
                }
              }
            }
          }
        }
      }
    }
  }`;
  const variables = { namespace: 'epic', country: 'US', locale: 'en-US' };
  const data: GraphQLBody = { query, variables };
  const resp = await request.post<PromotionsQueryResponse>(GRAPHQL_ENDPOINT, { json: data });
  const nowDate = new Date();
  const freeOfferedGames = resp.body.data.Catalog.catalogOffers.elements.filter(offer => {
    let r = false;
    if (offer.promotions) {
      offer.promotions.promotionalOffers.forEach(innerOffers => {
        innerOffers.promotionalOffers.forEach(pOffer => {
          const startDate = new Date(pOffer.startDate);
          const endDate = new Date(pOffer.endDate);
          const isFree = pOffer.discountSetting.discountPercentage === 0;
          if (startDate <= nowDate && nowDate <= endDate && isFree) {
            r = true;
          }
        });
      });
    }
    return r;
  });

  return freeOfferedGames;
}

// TODO: Parameterize region (en-US). Env var probably
async function ownsGame(linkedOfferNs: string, linkedOfferId: string): Promise<boolean> {
  L.debug(
    {
      linkedOfferNs,
      linkedOfferId,
    },
    'Getting product info'
  );
  const query = `query launcherQuery($namespace:String!, $offerId:String!) {
    Launcher {
      entitledOfferItems(namespace: $namespace, offerId: $offerId) {
        namespace
        offerId
        entitledToAllItemsInOffer
        entitledToAnyItemInOffer
      }
    }
  }`;
  const variables = {
    namespace: linkedOfferNs,
    offerId: linkedOfferId,
  };
  const data: GraphQLBody = { query, variables };
  const entitlementResp = await request.post<ItemEntitlementResp>(GRAPHQL_ENDPOINT, {
    json: data,
  });
  const items = entitlementResp.body.data.Launcher.entitledOfferItems;
  return items.entitledToAllItemsInOffer && items.entitledToAnyItemInOffer;
}

async function getPurchasableFreeGames(validOffers: OfferElement[]): Promise<OfferInfo[]> {
  const ownsGamePromises = validOffers.map(offer => {
    return ownsGame(offer.linkedOfferNs, offer.linkedOfferId);
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
  const validFreeGames = await getFreeGames();
  L.info({ availableGames: validFreeGames.map(game => game.title) }, 'Available free games');
  const purchasableGames = await getPurchasableFreeGames(validFreeGames);
  L.info(
    { purchasableGames: purchasableGames.map(game => game.productName) },
    'Unpurchased free games'
  );
  for (let i = 0; i < purchasableGames.length; i += 1) {
    L.info(`Purchasing ${purchasableGames[i].productName}`);
    // eslint-disable-next-line no-await-in-loop
    await purchase(purchasableGames[i].offerNamespace, purchasableGames[i].offerId);
    L.debug('Done purchasing');
  }
}

async function main(): Promise<void> {
  try {
    // Login
    if (await refreshAndSid(false)) {
      L.info('Successfully refreshed login');
    } else {
      L.debug('Could not refresh credentials. Logging in fresh.');
      await getReputation();
      await login(EMAIL, PASSWORD);
      await refreshAndSid(true);
    }
    await getAllFreeGames();
  } catch (e) {
    L.error(e);
    if (e.response.body) {
      L.error(e.response.body);
    }
  }
}

if (process.env.RUN_ON_STARTUP) main();

const cronTime = process.env.CRON_SCHEDULE || '0 12 * * *';
scheduleJob(cronTime, async () => main());
