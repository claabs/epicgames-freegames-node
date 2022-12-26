export interface SlugOffer {
  id: string;
  namespace: string;
  effectiveDate: string;
  expiryDate: null;
}

export interface CmsMapping {
  cmsSlug: string;
  offerId: null;
  offer: null;
  prePurchaseOfferId: null;
  prePurchaseOffer: null;
  pageId: null;
}

export interface OfferMapping {
  cmsSlug: null;
  offerId: string;
  offer: SlugOffer;
  prePurchaseOfferId: null;
  prePurchaseOffer: null;
  pageId: null;
}

export interface Mapping {
  pageSlug: string;
  pageType: string;
  sandboxId: string;
  productId: string;
  createdDate: Date;
  updatedDate: Date;
  mappings: CmsMapping | OfferMapping;
}

export interface StorePageMapping {
  mapping: Mapping;
}

export interface Data {
  StorePageMapping: StorePageMapping;
}

export interface PageSlugMappingResponse {
  data: Data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extensions: any;
}

export interface PageSlugMappingResult {
  namespace: string;
  offerId: string;
}
