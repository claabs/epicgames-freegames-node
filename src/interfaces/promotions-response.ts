/* eslint-disable @typescript-eslint/no-explicit-any */
export interface KeyImage {
  type: string;
  url: string;
}

export interface Seller {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  namespace: string;
}

export interface CustomAttribute {
  key: string;
  value: string;
}

export interface Category {
  path: string;
}

export interface Tag {
  id: string;
}

export interface CurrencyInfo {
  decimals: number;
}

export interface FmtPrice {
  originalPrice: string;
  discountPrice: string;
  intermediatePrice: string;
}

export interface TotalPrice {
  discountPrice: number;
  originalPrice: number;
  voucherDiscount: number;
  discount: number;
  currencyCode: string;
  currencyInfo: CurrencyInfo;
  fmtPrice: FmtPrice;
}

export interface LineOffer {
  appliedRules: any[];
}

export interface Price {
  totalPrice: TotalPrice;
  lineOffers: LineOffer[];
}

export interface DiscountSetting {
  discountType: string;
  discountPercentage: number;
}

export interface PromotionalOffer2 {
  startDate: Date;
  endDate: Date;
  discountSetting: DiscountSetting;
}

export interface PromotionalOffer {
  promotionalOffers: PromotionalOffer2[];
}

export interface DiscountSetting2 {
  discountType: string;
  discountPercentage: number;
}

export interface PromotionalOffer3 {
  startDate: Date;
  endDate: Date;
  discountSetting: DiscountSetting2;
}

export interface UpcomingPromotionalOffer {
  promotionalOffers: PromotionalOffer3[];
}

export interface Promotions {
  promotionalOffers: PromotionalOffer[];
  upcomingPromotionalOffers: UpcomingPromotionalOffer[];
}

export interface Mapping {
  pageSlug: string;
  pageType: string;
}
export interface CatalogNS {
  mappings: Mapping[] | null;
}

export interface Element {
  title: string;
  id: string;
  namespace: string;
  description: string;
  effectiveDate: Date;
  offerType?: string;
  keyImages: KeyImage[];
  seller: Seller;
  productSlug: string;
  urlSlug: string;
  url?: any;
  items: Item[];
  customAttributes: CustomAttribute[];
  categories: Category[];
  tags: Tag[];
  catalogNs: CatalogNS;
  price: Price;
  promotions: Promotions;
}

export interface Paging {
  count: number;
  total: number;
}

export interface SearchStore {
  elements: Element[];
  paging: Paging;
}

export interface Catalog {
  searchStore: SearchStore;
}

export interface Data {
  Catalog: Catalog;
}

export interface Hint {
  path: any[];
  maxAge: number;
}

export interface CacheControl {
  version: number;
  hints: Hint[];
}

export interface Extensions {
  cacheControl: CacheControl;
}

export interface PromotionsQueryResponse {
  data: Data;
  extensions: Extensions;
}
