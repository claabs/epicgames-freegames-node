import { JSDOM } from 'jsdom';
import L from './common/logger';
import request from './common/request';
import { OrderPreviewResponse, OfferInfo, ConfirmPurcaseError } from './interfaces/types';
import { getCaptchaSessionToken, EpicArkosePublicKey } from './captcha';
import {
  ORDER_CONFIRM_ENDPOINT,
  ORDER_PREVIEW_ENDPOINT,
  EPIC_PURCHASE_ENDPOINT,
} from './common/constants';

export async function confirmOrder(
  orderPreview: OrderPreviewResponse,
  purchaseToken: string,
  captcha?: string
): Promise<void> {
  // TODO: Can probably just use a spread operator here?
  const confirmOrderRequest = {
    captchaToken: captcha,
    useDefault: true,
    setDefault: false,
    namespace: orderPreview.namespace,
    country: orderPreview.country,
    countryName: orderPreview.countryName,
    orderId: orderPreview.orderId,
    orderComplete: orderPreview.orderComplete,
    orderError: orderPreview.orderError,
    orderPending: orderPreview.orderPending,
    offers: orderPreview.offers,
    includeAccountBalance: false,
    totalAmount: 0,
    affiliateId: '',
    creatorSource: '',
    threeDSToken: '',
    voucherCode: null,
    syncToken: orderPreview.syncToken,
    isFreeOrder: false,
  };
  L.trace({ body: confirmOrderRequest, url: ORDER_CONFIRM_ENDPOINT }, 'Confirm order request');
  const confirmOrderResp = await request.client.post<ConfirmPurcaseError>(ORDER_CONFIRM_ENDPOINT, {
    json: confirmOrderRequest,
    headers: {
      'x-requested-with': purchaseToken,
    },
  });
  L.debug({ confirmOrderResponse: confirmOrderResp.body }, 'confirm order response');
  if (
    confirmOrderResp.body.errorCode &&
    confirmOrderResp.body.errorCode.includes('captcha.challenge')
  ) {
    L.debug('Captcha required');
    const newPreview = orderPreview;
    newPreview.syncToken = confirmOrderResp.body.syncToken;
    const captchaToken = await getCaptchaSessionToken(EpicArkosePublicKey.PURCHASE);
    await confirmOrder(newPreview, purchaseToken, captchaToken);
  } else {
    L.debug('Purchase successful');
  }
}

export async function purchase(linkedOfferNs: string, linkedOfferId: string): Promise<void> {
  const purchaseSearchParams = {
    namespace: linkedOfferNs,
    offers: linkedOfferId,
  };
  L.trace(
    { searchParams: purchaseSearchParams, url: EPIC_PURCHASE_ENDPOINT },
    'Request for purchase token'
  );
  const purchasePageResp = await request.client.get(EPIC_PURCHASE_ENDPOINT, {
    searchParams: purchaseSearchParams,
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
  L.trace({ body: orderPreviewRequest, url: ORDER_PREVIEW_ENDPOINT }, 'Order preview request');
  const orderPreviewResp = await request.client.post<OrderPreviewResponse>(ORDER_PREVIEW_ENDPOINT, {
    json: orderPreviewRequest,
    headers: {
      'x-requested-with': purchaseToken,
    },
  });
  L.debug({ orderPreviewResponse: orderPreviewResp.body }, 'Order preview response');
  if (orderPreviewResp.body.orderResponse && orderPreviewResp.body.orderResponse.error) {
    L.error(orderPreviewResp.body.orderResponse.message);
  }
  await confirmOrder(orderPreviewResp.body, purchaseToken);
}

export async function purchaseGames(offers: OfferInfo[]): Promise<void> {
  for (let i = 0; i < offers.length; i += 1) {
    L.info(`Purchasing ${offers[i].productName}`);
    // Async for-loop as running purchases in parallel may break
    // eslint-disable-next-line no-await-in-loop
    await purchase(offers[i].offerNamespace, offers[i].offerId);
    L.info(`Done purchasing ${offers[i].productName}`);
  }
}
