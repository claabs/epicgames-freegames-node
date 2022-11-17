/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MissingPrerequisiteItem {
  itemId: string;
  namespace: string;
}

export interface MissingPrerequisite {
  namespace: string;
  offerId: string;
  missingPrerequisiteItems: MissingPrerequisiteItem[];
}

export interface CartOffersValidation {
  conflictingOffers: any[];
  missingPrerequisites: MissingPrerequisite[];
  fullyOwnedOffers: any[];
  possiblePartialUpgradeOffers: any[];
  unablePartiallyUpgradeOffers: any[];
}

export interface Entitlements {
  cartOffersValidation: CartOffersValidation;
}

export interface Data {
  Entitlements: Entitlements;
}

export interface OffersValidationResponse {
  data: Data;
  extensions: any;
}
