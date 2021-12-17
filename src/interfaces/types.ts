/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface PurchaseLineOffer {
  appliedNsOfferIds: string[];
  namespace: string;
  offerId: string;
  quantity: number;
  title: string;
  upgradePathId: null;
}

export interface OrderPreviewRequest {
  eulaId: string | null;
  useDefaultBillingAccount: boolean;
  country: string;
  offers: string[] | null;
  lineOffers: PurchaseLineOffer[];
  setDefault: boolean;
  syncToken: string;
  canQuickPurchase: boolean;
  locale: string;
}

export interface OrderConfirmRequest extends OrderPreviewRequest {
  totalAmount: number;
  affiliateId: string;
  creatorSource: string;
  captchaToken?: string;
}

export interface ConfirmPurchaseError {
  confirmation: string;
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
  // eslint-disable-next-line camelcase
  arkose_data: ArkoseData;
}

export interface PurchaseError {
  error?: string;
  message?: string;
}

export type PreviewOrderResponseInner = Record<string, any> & PurchaseError;

export interface OrderPreviewResponse {
  affiliation: null;
  catalogResponse: any;
  country: string;
  countryName: string;
  lineOffers: null;
  message: null;
  namespace: string;
  offers: string[];
  orderComplete: boolean | null;
  orderError: boolean | null;
  orderId: null | null;
  orderPending: boolean | null;
  orderResponse: PreviewOrderResponseInner;
  showCurrencyChangeMessage: boolean;
  syncToken: string;
  voucherList: null;
}
