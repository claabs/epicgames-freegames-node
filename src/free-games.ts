import L from './common/logger';
import request from './common/request';
import { GraphQLBody, OfferInfo } from './interfaces/types';
import { PromotionsQueryResponse, Element } from './interfaces/promotions-response';
import { ItemEntitlementResp, ProductInfo, AuthErrorJSON } from './interfaces/product-info';
import {
  GRAPHQL_ENDPOINT,
  STORE_CONTENT,
  FREE_GAMES_PROMOTIONS_ENDPOINT,
} from './common/constants';
import { BundlesContent } from './interfaces/bundles-content';
import { refreshAndSid } from './login';

export async function getFreeGames(): Promise<Element[]> {
  L.debug('Getting current free games list');
  const freeGamesSearchParams = {
    locale: 'en',
    country: 'US',
    allowCountries: 'US',
  };
  L.trace(
    { url: FREE_GAMES_PROMOTIONS_ENDPOINT, params: freeGamesSearchParams },
    'Getting free games list'
  );
  const resp = await request.client.get<PromotionsQueryResponse>(FREE_GAMES_PROMOTIONS_ENDPOINT, {
    searchParams: freeGamesSearchParams,
  });
  const nowDate = new Date();
  const freeOfferedGames = resp.body.data.Catalog.searchStore.elements.filter(offer => {
    let r = false;
    if (offer.promotions) {
      offer.promotions.promotionalOffers.forEach(innerOffers => {
        innerOffers.promotionalOffers.forEach(pOffer => {
          const startDate = new Date(pOffer.startDate);
          const endDate = new Date(pOffer.endDate);
          const isFree = pOffer.discountSetting.discountPercentage === 0;
          if (startDate <= nowDate && nowDate <= endDate && isFree) {
            r = true;
          }
        });
      });
    }
    return r;
  });
  return freeOfferedGames;
}

// TODO: Parameterize region (en-US). Env var probably
async function ownsGame(linkedOfferNs: string, linkedOfferId: string): Promise<boolean> {
  L.debug(
    {
      linkedOfferNs,
      linkedOfferId,
    },
    'Getting product info'
  );
  const query = `query launcherQuery($namespace:String!, $offerId:String!) {
    Launcher {
      entitledOfferItems(namespace: $namespace, offerId: $offerId) {
        namespace
        offerId
        entitledToAllItemsInOffer
        entitledToAnyItemInOffer
      }
    }
  }`;
  const variables = {
    namespace: linkedOfferNs,
    offerId: linkedOfferId,
  };
  const data: GraphQLBody = { query, variables };
  L.trace({ data, url: GRAPHQL_ENDPOINT }, 'Posting for offer entitlement');
  const entitlementResp = await request.client.post<ItemEntitlementResp>(GRAPHQL_ENDPOINT, {
    json: data,
  });
  if (entitlementResp.body.errors && entitlementResp.body.errors[0]) {
    const error = entitlementResp.body.errors[0];
    const errorJSON: AuthErrorJSON = JSON.parse(error.serviceResponse);
    if (errorJSON.errorCode.includes('authentication_failed')) {
      L.warn('Failed to authenticate with GraphQL API, trying again');
      await refreshAndSid(true);
      return ownsGame(linkedOfferNs, linkedOfferId);
    }
    L.error(error);
    throw new Error(error.message);
  }
  const items = entitlementResp.body.data.Launcher.entitledOfferItems;
  return items.entitledToAllItemsInOffer && items.entitledToAnyItemInOffer;
}

export async function getPurchasableFreeGames(validOffers: Element[]): Promise<OfferInfo[]> {
  L.debug('Checking ownership on available games');
  const ownsGamePromises = validOffers.map(offer => {
    return ownsGame(offer.namespace, offer.id);
  });
  const ownsGames = await Promise.all(ownsGamePromises);
  const purchasableGames: OfferInfo[] = validOffers
    .filter((offer, index) => {
      return !ownsGames[index];
    })
    .map(offer => {
      return {
        offerNamespace: offer.namespace,
        offerId: offer.id,
        productName: offer.title,
        productSlug: offer.productSlug,
      };
    });
  return purchasableGames;
}

export async function updateIds(offers: Element[]): Promise<Element[]> {
  L.debug('Mapping IDs to offer');
  const promises = offers.map(
    async (offer, index): Promise<Element> => {
      const productTypes = offer.categories.map(cat => cat.path);
      if (productTypes.includes('games')) {
        const url = `${STORE_CONTENT}/products/${offer.productSlug}`;
        L.trace({ url }, 'Fetching updated IDs');
        const productsResp = await request.client.get<ProductInfo>(url);
        // eslint-disable-next-line no-underscore-dangle
        let mainGamePage = productsResp.body.pages.find(page => page._slug === 'home');
        if (!mainGamePage) {
          L.debug('No home page found, using first');
          [mainGamePage] = productsResp.body.pages;
        }
        if (!mainGamePage) {
          throw new Error('No product pages available');
        }
        return {
          ...offers[index],
          id: mainGamePage.offer.id,
          namespace: mainGamePage.offer.namespace,
        };
      }
      if (productTypes.includes('bundles')) {
        const url = `${STORE_CONTENT}/bundles/${offer.productSlug}`;
        L.trace({ url }, 'Fetching updated IDs');
        const bundlesResp = await request.client.get<BundlesContent>(url);
        return {
          ...offers[index],
          id: bundlesResp.body.offer.id,
          namespace: bundlesResp.body.offer.namespace,
        };
      }
      throw new Error(`Unrecognized productType: ${productTypes}`);
    }
  );
  const responses = await Promise.all(promises);
  return responses;
}

export async function getAllFreeGames(): Promise<OfferInfo[]> {
  const validFreeGames = await getFreeGames();
  L.info({ availableGames: validFreeGames.map(game => game.title) }, 'Available free games');
  const updatedOffers = await updateIds(validFreeGames);
  const purchasableGames = await getPurchasableFreeGames(updatedOffers);
  L.info(
    { purchasableGames: purchasableGames.map(game => game.productName) },
    'Unpurchased free games'
  );
  return purchasableGames;
}
