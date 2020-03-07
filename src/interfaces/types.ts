/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cookie } from 'set-cookie-parser';

export interface CSRFSetCookies {
  EPIC_FUNNEL_ID: Cookie;
  EPIC_DEVICE: Cookie;
  EPIC_SESSION_ID: Cookie;
  'XSRF-TOKEN': Cookie;
  EPIC_SESSION_AP: Cookie;
}

export interface LoginBody {
  password: string;
  rememberMe: boolean;
  captcha: string;
  email: string;
}

export interface GraphQLBody {
  query: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables?: { [key: string]: any };
}

export interface RedirectResponse {
  redirectUrl: string;
  sid: string | null;
}

export interface OrderPreviewResponse {
  affiliation: null;
  catalogResponse: any;
  country: string;
  countryName: string;
  message: null;
  namespace: string;
  offers: string[];
  orderComplete: boolean;
  orderError: boolean;
  orderId: null;
  orderPending: boolean;
  orderResponse: any;
  paypalError: null;
  showCurrencyChangeMessage: boolean;
  syncToken: string;
  voucherList: null;
}

export interface OfferInfo {
  offerNamespace: string;
  offerId: string;
  productName: string;
}
