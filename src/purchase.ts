import {
  EPIC_CLIENT_ID,
  EPIC_PURCHASE_ENDPOINT,
  ID_LOGIN_ENDPOINT,
  REDIRECT_ENDPOINT,
} from './common/constants.js';
import { OfferInfo } from './interfaces/types.js';

export const generateLoginRedirect = (redirectUrl: string): string => {
  const loginRedirectUrl = new URL(ID_LOGIN_ENDPOINT);
  loginRedirectUrl.searchParams.set('noHostRedirect', 'true');
  loginRedirectUrl.searchParams.set('redirectUrl', redirectUrl);
  loginRedirectUrl.searchParams.set('client_id', EPIC_CLIENT_ID);
  return loginRedirectUrl.toString();
};

export const generateIdRedirect = (redirectUrl: string): string => {
  // https://www.epicgames.com/id/api/redirect?redirectUrl=https://store.epicgames.com/en-US/&clientId=875a3b57d3a640a6b7f9b4e883463ab4
  const idRedirectUrl = new URL(REDIRECT_ENDPOINT);
  idRedirectUrl.searchParams.set('redirectUrl', redirectUrl);
  idRedirectUrl.searchParams.set('clientId', EPIC_CLIENT_ID);
  return idRedirectUrl.toString();
};

export const generateCheckoutUrl = (offers: OfferInfo[]): string => {
  const offersParams = offers
    .map((offer) => `&offers=1-${offer.offerNamespace}-${offer.offerId}`)
    .join('');
  const checkoutUrl = `${EPIC_PURCHASE_ENDPOINT}?highlightColor=0078f2${offersParams}&orderId&purchaseToken&showNavigation=true`;
  return generateLoginRedirect(checkoutUrl);
};
