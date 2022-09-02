/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AgeGating {
  ageControl: number;
  descriptor: null | string;
  elements: null;
  gameRating: string;
  ratingImage: string;
  ratingSystem: string;
  title: string;
}

export interface Mappings {
  cmsSlug: null | string;
  offerId: null | string;
}

export interface Mapping {
  createdDate: string;
  deletedDate: null;
  mappings: Mappings;
  pageSlug: string;
  pageType: string;
  productId: string;
  sandboxId: string;
  updatedDate: string;
}

export interface CatalogNS {
  ageGatings: AgeGating[];
  displayName: string;
  mappings: Mapping[];
  store: string;
}

export interface Category {
  path: string;
}

export interface CustomAttribute {
  key: string;
  value: string;
}

export interface Item {
  id: string;
  namespace: string;
  releaseInfo: null;
}

export interface KeyImage {
  type: string;
  url: string;
}

export interface DiscountSetting {
  discountType: string;
}

export interface AppliedRule {
  id: string;
  endDate: string;
  discountSetting: DiscountSetting;
}

export interface LineOffer {
  appliedRules: AppliedRule[];
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

export interface Price {
  totalPrice: TotalPrice;
  lineOffers: LineOffer[];
}

export interface Seller {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  groupName: null | string;
}

export interface CatalogOffer {
  title: string;
  id: string;
  namespace: string;
  countriesBlacklist: string[] | null;
  countriesWhitelist: string[] | null;
  developerDisplayName: null;
  description: string;
  effectiveDate: string;
  expiryDate: null;
  externalLinks: null;
  isCodeRedemptionOnly: boolean;
  keyImages: KeyImage[];
  longDescription: null;
  seller: Seller;
  productSlug: string;
  publisherDisplayName: null;
  releaseDate: string;
  urlSlug: string;
  url: null;
  tags: Tag[];
  items: Item[];
  customAttributes: CustomAttribute[];
  categories: Category[];
  catalogNs: CatalogNS;
  offerMappings: any[];
  pcReleaseDate: null;
  prePurchase: null;
  price: Price;
  allDependNsOfferIds: null;
  majorNsOffers: any[];
  subNsOffers: any[];
}

export interface Catalog {
  catalogOffer: CatalogOffer;
}

export interface Data {
  Catalog: Catalog;
}

export interface GetCatalogOfferResponse {
  data: Data;
  extensions: any;
}
