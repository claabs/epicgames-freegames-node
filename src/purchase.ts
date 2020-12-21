import { JSDOM } from 'jsdom';
import { Got } from 'got';
import { Logger } from 'pino';
import logger from './common/logger';
import {
  OrderPreviewResponse,
  OfferInfo,
  ConfirmPurcaseError,
  OrderConfirmRequest,
} from './interfaces/types';
import { EpicArkosePublicKey, notifyManualCaptcha } from './captcha';
import {
  ORDER_CONFIRM_ENDPOINT,
  ORDER_PREVIEW_ENDPOINT,
  EPIC_PURCHASE_ENDPOINT,
} from './common/constants';

export default class Purchase {
  private request: Got;

  private L: Logger;

  private email: string;

  constructor(requestClient: Got, email: string) {
    this.request = requestClient;
    this.L = logger.child({
      user: email,
    });
    this.email = email;
  }

  async confirmOrder(
    orderPreview: OrderPreviewResponse,
    purchaseToken: string,
    captcha?: string
  ): Promise<void> {
    // TODO: Can probably just use a spread operator here?
    const confirmOrderRequest: OrderConfirmRequest = {
      captchaToken: captcha,
      useDefault: true,
      setDefault: false,
      namespace: orderPreview.namespace,
      country: orderPreview.country,
      countryName: orderPreview.countryName,
      orderId: orderPreview.orderId,
      orderComplete: orderPreview.orderComplete || false,
      orderError: orderPreview.orderError || false,
      orderPending: orderPreview.orderPending || false,
      offers: orderPreview.offers,
      includeAccountBalance: false,
      totalAmount: 0,
      affiliateId: '',
      creatorSource: '',
      threeDSToken: '',
      voucherCode: null,
      syncToken: orderPreview.syncToken,
      eulaId: null,
      useDefaultBillingAccount: true,
      canQuickPurchase: true,
    };
    this.L.trace(
      { body: confirmOrderRequest, url: ORDER_CONFIRM_ENDPOINT },
      'Confirm order request'
    );
    try {
      const confirmOrderResp = await this.request.post<ConfirmPurcaseError>(
        ORDER_CONFIRM_ENDPOINT,
        {
          json: confirmOrderRequest,
          headers: {
            'x-requested-with': purchaseToken,
          },
        }
      );
      this.L.debug({ confirmOrderResponse: confirmOrderResp.body }, 'confirm order response');
      if (
        confirmOrderResp.body.errorCode &&
        confirmOrderResp.body.errorCode.includes('captcha.challenge')
      ) {
        this.L.debug('Captcha required');
        const newPreview = orderPreview;
        newPreview.syncToken = confirmOrderResp.body.syncToken;
        const captchaToken = await notifyManualCaptcha(this.email, EpicArkosePublicKey.PURCHASE);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for two seconds to prevent 400s?
        await this.confirmOrder(newPreview, purchaseToken, captchaToken);
      } else {
        this.L.debug('Purchase successful');
      }
    } catch (e) {
      if (e.response?.body?.message?.includes('you already own this item')) {
        // This still means that you may need to solve a captcha.
        // TODO: Check ownership before purchasing?
        this.L.debug('Item already owned');
      } else {
        throw e;
      }
    }
  }

  async purchase(linkedOfferNs: string, linkedOfferId: string): Promise<void> {
    const purchaseSearchParams = {
      namespace: linkedOfferNs,
      offers: linkedOfferId,
    };
    this.L.trace(
      { searchParams: purchaseSearchParams, url: EPIC_PURCHASE_ENDPOINT },
      'Request for purchase token'
    );
    const purchasePageResp = await this.request.get(EPIC_PURCHASE_ENDPOINT, {
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
    this.L.debug({ purchaseToken }, 'purchaseToken');
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
    this.L.trace(
      { body: orderPreviewRequest, url: ORDER_PREVIEW_ENDPOINT },
      'Order preview request'
    );
    const orderPreviewResp = await this.request.post<OrderPreviewResponse>(ORDER_PREVIEW_ENDPOINT, {
      json: orderPreviewRequest,
      headers: {
        'x-requested-with': purchaseToken,
      },
    });
    this.L.debug({ orderPreviewResponse: orderPreviewResp.body }, 'Order preview response');
    if (orderPreviewResp.body.orderResponse && orderPreviewResp.body.orderResponse.error) {
      this.L.error(orderPreviewResp.body.orderResponse.message);
    }
    await this.confirmOrder(orderPreviewResp.body, purchaseToken);
  }

  async purchaseGames(offers: OfferInfo[]): Promise<void> {
    for (let i = 0; i < offers.length; i += 1) {
      this.L.info(`Purchasing ${offers[i].productName}`);
      // Async for-loop as running purchases in parallel may break
      // eslint-disable-next-line no-await-in-loop
      await this.purchase(offers[i].offerNamespace, offers[i].offerId);
      this.L.info(`Done purchasing ${offers[i].productName}`);
    }
  }
}
