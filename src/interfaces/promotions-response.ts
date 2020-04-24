export interface PromotionsQueryResponse {
  data: Data;
  extensions: Extensions;
}

export interface PromotionalOfferInner {
  startDate: Date;
  endDate: Date;
  discountSetting: DiscountSetting;
}

export interface PromotionalOfferOuter {
  promotionalOffers: PromotionalOfferInner[];
}

export interface Promotions {
  promotionalOffers: PromotionalOfferOuter[];
}

export interface Items {
  id: string;
  namespace: string;
}

export interface OfferElement {
  title: string;
  id: string;
  namespace: string;
  description: string;
  productSlug: string;
  items: Items;
  promotions: Promotions | null;
}

export interface SearchStore {
  elements: OfferElement[];
}

export interface Catalog {
  searchStore: SearchStore;
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

export interface DiscountSetting {
  discountType: string;
  discountPercentage: number;
}
