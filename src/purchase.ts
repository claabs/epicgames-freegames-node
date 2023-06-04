import { EPIC_PURCHASE_ENDPOINT } from './common/constants';
import { OfferInfo } from './interfaces/types';

export const generateCheckoutUrl = (offers: OfferInfo[]): string => {
  const offersParams = offers
    .map((offer) => `&offers=1-${offer.offerNamespace}-${offer.offerId}`)
    .join('');
  return `${EPIC_PURCHASE_ENDPOINT}?highlightColor=0078f2${offersParams}&orderId&purchaseToken&showNavigation=true`;
};
