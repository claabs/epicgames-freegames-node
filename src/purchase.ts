import { JSDOM } from 'jsdom';
import L from './common/logger';
import request from './common/request';
import { OrderPreviewResponse, OfferInfo } from './interfaces/types';

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
  if (orderPreviewResp.body.orderResponse && orderPreviewResp.body.orderResponse.error) {
    L.error(orderPreviewResp.body.orderResponse.message);
  }
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

export async function purchaseGames(offers: OfferInfo[]): Promise<void> {
  for (let i = 0; i < offers.length; i += 1) {
    L.info(`Purchasing ${offers[i].productName}`);
    // Async for-loop as running purchases in parallel may break
    // eslint-disable-next-line no-await-in-loop
    await purchase(offers[i].offerNamespace, offers[i].offerId);
    L.debug('Done purchasing');
  }
}
