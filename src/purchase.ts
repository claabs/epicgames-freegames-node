import { EPIC_CLIENT_ID, EPIC_PURCHASE_ENDPOINT, ID_LOGIN_ENDPOINT } from './common/constants';
import { OfferInfo } from './interfaces/types';

export const generateCheckoutUrl = (offers: OfferInfo[]): string => {
  const offersParams = offers
    .map((offer) => `&offers=1-${offer.offerNamespace}-${offer.offerId}`)
    .join('');
  const checkoutUrl = `${EPIC_PURCHASE_ENDPOINT}?highlightColor=0078f2${offersParams}&orderId&purchaseToken&showNavigation=true`;
  const loginRedirectCheckoutUrl = new URL(ID_LOGIN_ENDPOINT);
  loginRedirectCheckoutUrl.searchParams.set('noHostRedirect', 'true');
  loginRedirectCheckoutUrl.searchParams.set('redirectUrl', checkoutUrl);
  loginRedirectCheckoutUrl.searchParams.set('client_id', EPIC_CLIENT_ID);
  return loginRedirectCheckoutUrl.toString();
};
