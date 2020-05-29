import L from './common/logger';
import request from './common/request';
import { GraphQLBody, OfferInfo } from './interfaces/types';
import { PromotionsQueryResponse, Element } from './interfaces/promotions-response';
import { ItemEntitlementResp, ProductInfo } from './interfaces/product-info';
import {
  GRAPHQL_ENDPOINT,
  STORE_CONTENT,
  FREE_GAMES_PROMOTIONS_ENDPOINT,
} from './common/constants';
import { BundlesContent } from './interfaces/bundles-content';

export async function getFreeGames(): Promise<Element[]> {
  const resp = await request.client.get<PromotionsQueryResponse>(FREE_GAMES_PROMOTIONS_ENDPOINT, {
    searchParams: {
      locale: 'en',
      country: 'US',
      allowCountries: 'US',
    },
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
  L.debug({ data, url: GRAPHQL_ENDPOINT }, 'Posting for offer entitlement');
  const entitlementResp = await request.client.post<ItemEntitlementResp>(GRAPHQL_ENDPOINT, {
    json: data,
  });
  const items = entitlementResp.body.data.Launcher.entitledOfferItems;
  return items.entitledToAllItemsInOffer && items.entitledToAnyItemInOffer;
}

export async function getPurchasableFreeGames(validOffers: Element[]): Promise<OfferInfo[]> {
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
  const promises = offers.map(
    async (offer, index): Promise<Element> => {
      const productType = offer.categories[2].path;
      if (productType === 'games') {
        const url = `${STORE_CONTENT}/products/${offer.productSlug}`;
        L.debug({ url }, 'Fetching updated IDs');
        const productsResp = await request.client.get<ProductInfo>(url);
        return {
          ...offers[index],
          id: productsResp.body.pages[0].offer.id,
          namespace: productsResp.body.pages[0].offer.namespace,
        };
      }
      if (productType === 'bundles') {
        const url = `${STORE_CONTENT}/bundles/${offer.productSlug}`;
        L.debug({ url }, 'Fetching updated IDs');
        const bundlesResp = await request.client.get<BundlesContent>(url);
        return {
          ...offers[index],
          id: bundlesResp.body.offer.id,
          namespace: bundlesResp.body.offer.namespace,
        };
      }
      throw new Error(`Unrecognized productType: ${productType}`);
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
