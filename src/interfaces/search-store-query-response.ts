/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Mapping {
  pageSlug: string;
  pageType: string;
}
export interface CatalogNS {
  mappings: Mapping[] | null;
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
  endDate: null | string;
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
}

export interface Paging {
  count: number;
  total: number;
}

export interface Location {
  line: number;
  column: number;
}

export interface Error {
  message: string;
  locations: Location[];
  correlationId: string;
  serviceResponse: string;
  stack: null;
  path: (number | string)[];
}

export interface Element {
  title: string;
  id: string;
  namespace: string;
  description: string;
  effectiveDate: string;
  keyImages: KeyImage[];
  currentPrice: number;
  seller: Seller;
  productSlug: null | string;
  urlSlug: string;
  url: null;
  tags: Tag[];
  items: Item[];
  customAttributes: CustomAttribute[];
  categories: Category[];
  catalogNs: CatalogNS;
  offerMappings: Mapping[] | null;
  developerDisplayName: null | string;
  publisherDisplayName: null | string;
  price: Price;
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

export interface SearchStoreQueryResponse {
  errors?: Error[];
  data: Data;
  extensions: any;
}
