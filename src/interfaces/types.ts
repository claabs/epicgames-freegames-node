/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cookie } from 'set-cookie-parser';

export interface CSRFSetCookies {
  EPIC_FUNNEL_ID: Cookie;
  EPIC_DEVICE: Cookie;
  EPIC_SESSION_ID: Cookie;
  'XSRF-TOKEN': Cookie;
  'XSRF-AM-TOKEN': Cookie;
  EPIC_SESSION_AP: Cookie;
}

export interface LoginBody {
  password: string;
  rememberMe: boolean;
  captcha: string;
  email: string;
}

export interface MFABody {
  code: string;
  method: 'authenticator';
  rememberDevice: boolean;
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

export interface OrderResponse extends Record<string, any> {
  error: boolean;
  message: string;
}

export interface CatalogResponse {
  currencySymbolPlacement: string;
  code: string;
  displayName: string;
  ratingSystem: string;
  embargoed: boolean;
  sellerOfRecord: string;
  vatChargeRate: number;
  ratingSystems: any[];
  vatPercentage: number;
  defaultCurrency: string;
  vatIncluded: boolean;
  region: string;
  sellerOfRecordName: string;
  paymentCurrency: string;
}

export interface OrderPreviewResponse {
  affiliation: null;
  catalogResponse: any;
  country: string;
  countryName: string;
  message: null;
  namespace: string;
  offers: string[];
  orderComplete: boolean | null;
  orderError: boolean | null;
  orderId: null | null;
  orderPending: boolean | null;
  orderResponse: OrderResponse;
  paypalError: null;
  showCurrencyChangeMessage: boolean;
  syncToken: string;
  voucherList: null;
}

export interface OrderConfirmRequest {
  useDefault: boolean;
  setDefault: boolean;
  namespace: string;
  country: string;
  countryName: string;
  orderId: string | null;
  orderComplete: boolean;
  orderError: boolean;
  orderPending: boolean;
  offers: string[];
  includeAccountBalance: boolean;
  totalAmount: number;
  affiliateId: string;
  creatorSource: string;
  threeDSToken: string;
  voucherCode: string | null;
  eulaId: string | null;
  useDefaultBillingAccount: boolean;
  syncToken: string;
  captchaToken?: string;
  canQuickPurchase?: boolean;
}

export interface ConfirmPurcaseError {
  captchaResult: string;
  syncToken: string;
  errorCode: string;
}

export interface OfferInfo {
  offerNamespace: string;
  offerId: string;
  productName: string;
  productSlug: string;
}

export interface ArkoseData {
  blob: string;
}

export interface ReputationData {
  verdict: string;
  arkose_data: ArkoseData;
}
