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
  captcha: '';
  email: string;
}

export interface GraphQLBody {
  query: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables?: { [key: string]: any };
}

export interface FreegamesResponse {
  data: Data;
  extensions: Extensions;
}

export interface Category {
  path: string;
}

export interface PromotionalOfferInner {
  startDate: Date;
  endDate: Date;
}

export interface PromotionalOfferOuter {
  promotionalOffers: PromotionalOfferInner[];
}

export interface Promotions {
  promotionalOffers: PromotionalOfferOuter[];
}

export interface Element {
  title: string;
  description: string;
  id: string;
  namespace: string;
  categories: Category[];
  linkedOfferNs: string;
  linkedOfferId: string;
  productSlug: string;
  promotions: Promotions;
}

export interface CatalogOffers {
  elements: Element[];
}

export interface Catalog {
  catalogOffers: CatalogOffers;
}

export interface Data {
  Catalog: Catalog;
}

export interface Hint {
  path: ExtensionPath[];
  maxAge: number;
}

export type ExtensionPath = string | number;

export interface CacheControl {
  version: number;
  hints: Hint[];
}

export interface Extensions {
  cacheControl: CacheControl;
}

export interface RootObject {
  data: Data;
  extensions: Extensions;
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
