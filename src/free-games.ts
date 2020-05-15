import L from './common/logger';
import request from './common/request';
import { GraphQLBody, OfferInfo } from './interfaces/types';
import { PromotionsQueryResponse, OfferElement } from './interfaces/promotions-response';
import { ItemEntitlementResp, ProductInfo } from './interfaces/product-info';
import { GRAPHQL_ENDPOINT, STORE_CONTENT } from './common/constants';

export async function getFreeGames(): Promise<OfferElement[]> {
  const query = `query searchStoreQuery($allowCountries: String, $category: String, $count: Int, $country: String!, $keywords: String, $locale: String, $namespace: String, $sortBy: String, $sortDir: String, $start: Int, $tag: String, $withPromotions: Boolean = false) {
    Catalog {
      searchStore(allowCountries: $allowCountries, category: $category, count: $count, country: $country, keywords: $keywords, locale: $locale, namespace: $namespace, sortBy: $sortBy, sortDir: $sortDir, start: $start, tag: $tag) {
        elements {
          title
          id
          namespace
          description
          productSlug
          items {
            id
            namespace
          }
          promotions(category: $category) @include(if: $withPromotions) {
            promotionalOffers {
              promotionalOffers {
                startDate
                endDate
                discountSetting {
                  discountType
                  discountPercentage
                }
              }
            }
          }
        }
        paging {
          count
          total
        }
      }
    }
  }`;
  const variables = {
    category: 'freegames',
    sortBy: 'effectiveDate',
    sortDir: 'asc',
    count: 1000,
    country: 'US',
    allowCountries: 'US',
    locale: 'en-US',
    withPromotions: true,
  };
  const data: GraphQLBody = { query, variables };
  const resp = await request.post<PromotionsQueryResponse>(GRAPHQL_ENDPOINT, { json: data });
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
  const entitlementResp = await request.post<ItemEntitlementResp>(GRAPHQL_ENDPOINT, {
    json: data,
  });
  const items = entitlementResp.body.data.Launcher.entitledOfferItems;
  return items.entitledToAllItemsInOffer && items.entitledToAnyItemInOffer;
}

export async function getPurchasableFreeGames(validOffers: OfferElement[]): Promise<OfferInfo[]> {
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

export async function updateIds(offers: OfferElement[]): Promise<OfferElement[]> {
  const promises = offers.map(offer => {
    return request.get<ProductInfo>(`${STORE_CONTENT}/${offer.productSlug}`);
  });
  const responses = await Promise.all(promises);
  return responses.map((resp, index) => {
    return {
      ...offers[index],
      id: resp.body.pages[0].offer.id,
      namespace: resp.body.pages[0].offer.namespace,
    };
  });
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
