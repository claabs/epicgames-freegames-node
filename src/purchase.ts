import { JSDOM } from 'jsdom';
import { Got } from 'got';
import { Logger } from 'pino';
import logger from './common/logger';
import {
  OrderPreviewResponse,
  ConfirmPurchaseError,
  OrderConfirmRequest,
  OrderPreviewRequest,
} from './interfaces/types';
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
    orderPreviewReq: OrderPreviewRequest,
    orderPreviewRes: OrderPreviewResponse,
    purchaseToken: string
  ): Promise<void> {
    const confirmOrderRequest: OrderConfirmRequest = {
      eulaId: null,
      useDefaultBillingAccount: false,
      country: orderPreviewReq.country,
      offers: orderPreviewReq.offers,
      lineOffers: orderPreviewReq.lineOffers,
      totalAmount: 0,
      setDefault: orderPreviewReq.setDefault,
      syncToken: orderPreviewRes.syncToken,
      canQuickPurchase: true,
      locale: orderPreviewReq.locale,
      affiliateId: '',
      creatorSource: '',
    };
    this.L.trace(
      { body: confirmOrderRequest, url: ORDER_CONFIRM_ENDPOINT },
      'Confirm order request'
    );
    try {
      const confirmOrderResp = await this.request.post<ConfirmPurchaseError>(
        ORDER_CONFIRM_ENDPOINT,
        {
          json: confirmOrderRequest,
          headers: {
            'x-requested-with': purchaseToken,
          },
        }
      );
      this.L.debug({ confirmation: confirmOrderResp.body.confirmation }, 'confirm order response');
      if (
        confirmOrderResp.body.errorCode &&
        confirmOrderResp.body.errorCode.includes('captcha.challenge')
      ) {
        throw new Error('Captcha required for purchase');
      } else {
        this.L.debug('Purchase successful');
      }
    } catch (e) {
      if (e.response?.body?.message?.includes('you already own this item')) {
        // This still means that you may need to solve a captcha.
        // TODO: Check ownership before purchasing?
        this.L.debug('Item already owned');
        return;
      }
      if (e.response?.body) {
        this.L.debug(
          { errorBody: e.response.body, code: e.response?.statusCode },
          'Error encountered during purchase'
        );
      }
      throw e;
    }
  }

  async purchase(namespace: string, offerId: string, title: string): Promise<void> {
    const purchaseSearchParams = {
      namespace,
      offers: offerId,
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

    const orderPreviewRequest: OrderPreviewRequest = {
      canQuickPurchase: false,
      country: 'US',
      eulaId: null,
      lineOffers: [
        {
          appliedNsOfferIds: [],
          namespace,
          offerId,
          quantity: 1,
          title,
          upgradePathId: null,
        },
      ],
      locale: 'en_US',
      offers: null,
      setDefault: false,
      syncToken: '',
      useDefaultBillingAccount: true,
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
    this.L.trace(/* { orderPreviewResponse: orderPreviewResp.body }, */ 'Order preview response');
    if (
      orderPreviewResp.body.orderResponse?.error &&
      orderPreviewResp.body.orderResponse?.message
    ) {
      this.L.error(orderPreviewResp.body.orderResponse.message);
    }
    await this.confirmOrder(orderPreviewRequest, orderPreviewResp.body, purchaseToken);
  }
}
