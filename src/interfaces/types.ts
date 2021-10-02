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
  orderResponse: PreviewOrderResponse;
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
  lineOffers: ConfirmLineOffer[];
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

export interface ConfirmLineOffer {
  offerId: string;
  title: string;
  namespace: string;
  upgradePathId: string | null;
}

export interface ArkoseData {
  blob: string;
}

export interface ReputationData {
  verdict: string;
  arkose_data: ArkoseData;
}

export interface PurchaseError {
  error?: string;
  message?: string;
}

export interface PreviewOrderResponse extends PurchaseError {
  orderType: string;
  symbol: string;
  country: string;
  agentUserName: string;
  toUSDExchangeRate: number;
  totalPrice: number;
  accountIpCountry: string;
  resendReceiptForPublic: boolean;
  formattedTotalPrice: FormattedAmount;
  formattedConvenienceFee: FormattedAmount;
  paymentCurrencySymbol: string;
  vatRate: number;
  orderStatus: string;
  epicAccountId: string;
  salesChannel: string;
  formattedPresentmentAmount: FormattedAmount;
  canQuickPurchase: boolean;
  formattedBillingPaymentAmount: FormattedAmount;
  taxStatus: string;
  totalTax: number;
  isFree: boolean;
  coupons: any[];
  walletPaymentAmount: number;
  totalDiscounted: number;
  resendReceiptForAdmin: boolean;
  useSplitPayment: boolean;
  currency: string;
  formattedTotalTax: FormattedAmount;
  rewardVoucher: null;
  fraudScore: number;
  lastModifiedDate: string;
  paymentCurrencyCode: string;
  paymentCurrencyAmount: number;
  accountIpAddress: string;
  vat: number;
  batchJobFailedRetryCount: number;
  lineOffers: PreviewLineOffer[];
  merchantGroup: string;
  creationDate: string;
  formattedWalletPaymentAmount: FormattedAmount;
  convenienceFee: number;
  identityId: string;
  fraud: boolean;
  billingPaymentAmount: number;
  vatIncluded: boolean;
  paymentCurrencyExchangeRate: number;
  formattedTotalDiscounted: FormattedAmount;
  canSplitPayment: boolean;
}

export interface FormattedAmount {
  amount: string;
  symbol: string;
  placement: string;
  decimals: number;
  digits: number;
}

export interface PreviewLineOffer {
  totalPrice: number;
  formattedTotalPrice: FormattedAmount;
  entitlementSource: string;
  vatRate: number;
  sellerName: string;
  refundedRevenueWithoutTax: number;
  revenueWithoutTax: number;
  title: string;
  formattedBasePrice: FormattedAmount;
  offerType: string;
  basePayoutCurrencyCode: string;
  sellerId: string;
  formattedDiscountedPrice: FormattedAmount;
  refundedBasePayoutPrice: number;
  remainingDiscountPrice: number;
  refundedConvenienceFee: number;
  refundedTax: number;
  initiatedBy: string;
  basePrice: number;
  formattedBasePayoutPrice: FormattedAmount;
  unitPrice: number;
  refundedDiscountPrice: number;
  quantity: number;
  vat: number;
  formattedVoucherPrice: FormattedAmount;
  refundedQuantity: number;
  shareRate: number;
  shareRateByDeveloper: number;
  voucherDiscount: number;
  namespaceDisplayName: string;
  convenienceFee: number;
  discountedPrice: number;
  formattedTaxPrice: FormattedAmount;
  namespace: string;
  formattedUnitPrice: FormattedAmount;
  offerId: string;
  taxPrice: number;
  basePayoutPrice: number;
  roleNames: any[];
}
