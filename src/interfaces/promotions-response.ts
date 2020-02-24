export interface PromotionsQueryResponse {
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

export interface OfferElement {
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
  elements: OfferElement[];
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
