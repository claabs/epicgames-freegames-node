export interface OffersQueryResponse {
  data: OfferResponseData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extensions: any;
}

export interface OfferResponseData {
  Catalog: Catalog;
}

export interface Catalog {
  catalogOffer: CatalogOffer;
}

export interface CatalogOffer {
  title: string;
  id: string;
  namespace: string;
  description: string;
  effectiveDate: string;
  expiryDate: null;
  isCodeRedemptionOnly: boolean;
  productSlug: string;
  urlSlug: string;
  url: null;
  items: Item[];
  categories: Category[];
  price: Price;
}

export interface Category {
  path: string;
}

export interface Item {
  id: string;
  namespace: string;
}

export interface Price {
  totalPrice: TotalPrice;
}

export interface TotalPrice {
  discountPrice: number;
  originalPrice: number;
  voucherDiscount: number;
  discount: number;
  currencyCode: string;
}
