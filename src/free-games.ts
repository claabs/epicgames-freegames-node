import { Got } from 'got';
import { Logger } from 'pino';
import logger from './common/logger';
import { GraphQLBody, OfferInfo } from './interfaces/types';
import { PromotionsQueryResponse, Element } from './interfaces/promotions-response';
import { ItemEntitlementResp, ProductInfo, AuthErrorJSON } from './interfaces/product-info';
import {
  GRAPHQL_ENDPOINT,
  STORE_CONTENT,
  FREE_GAMES_PROMOTIONS_ENDPOINT,
} from './common/constants';
import { BundlesContent } from './interfaces/bundles-content';
import Login from './login';
import { config } from './common/config';
import { OffersQueryResponse } from './interfaces/offer-response';

export default class FreeGames {
  private request: Got;

  private L: Logger;

  private email: string;

  constructor(requestClient: Got, email: string) {
    this.request = requestClient;
    this.email = email;
    this.L = logger.child({
      user: email,
    });
  }

  async getCatalogFreeGames(): Promise<Element[]> {
    this.L.debug('Getting global free games');
    const query = `query searchStoreQuery($allowCountries: String, $category: String, $count: Int, $country: String!, $keywords: String, $locale: String, $namespace: String, $sortBy: String, $sortDir: String, $start: Int, $tag: String) {
      Catalog {
        searchStore(allowCountries: $allowCountries, category: $category, count: $count, country: $country, keywords: $keywords, locale: $locale, namespace: $namespace, sortBy: $sortBy, sortDir: $sortDir, start: $start, tag: $tag
        ) {
          elements {
            title
            id
            namespace
            description
            productSlug
            categories {
              path	
            }
            items {
              id
              namespace
            }
            promotions(category: $category) {
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
    const pageLimit = 1000;
    const variables = {
      category: 'games',
      sortBy: 'effectiveDate',
      sortDir: 'asc',
      count: pageLimit,
      country: 'US',
      allowCountries: 'US',
      locale: 'en-US',
      start: 0,
    };
    const data = { query, variables };
    this.L.trace({ data, url: GRAPHQL_ENDPOINT }, 'Posting for all games in catalog');
    const items = await this.request.paginate.all<Element, PromotionsQueryResponse>(
      GRAPHQL_ENDPOINT,
      {
        responseType: 'json',
        method: 'post',
        json: data,
        pagination: {
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          transform: response => {
            return response.body.data.Catalog.searchStore.elements;
          },
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          paginate: (_response, _allItems, currentItems) => {
            if (currentItems.length < pageLimit) {
              return false;
            }
            const newBody = data;
            newBody.variables.start = data.variables.start + pageLimit;
            return {
              json: newBody,
            };
          },
        },
      }
    );
    this.L.debug(`Retrieved catalog data for ${items.length} games`);
    const freeGames = items.filter(game => {
      return (
        game.promotions?.promotionalOffers[0]?.promotionalOffers[0]?.discountSetting
          ?.discountPercentage === 0
      );
    });
    this.L.trace(`Found ${freeGames.length} free games in catalog`);
    const uniqueFreeGames: Element[] = [];
    const map = new Map();
    // eslint-disable-next-line no-restricted-syntax
    for (const item of freeGames) {
      if (!map.has(item.productSlug)) {
        map.set(item.productSlug, true); // set any value to Map
        uniqueFreeGames.push(item);
      }
    }
    this.L.debug(`Found ${uniqueFreeGames.length} unique free games in catalog`);
    this.L.trace({ uniqueFreeGames }, 'Free games in catalog');
    return uniqueFreeGames;
  }

  async getWeeklyFreeGames(): Promise<Element[]> {
    this.L.debug('Getting current weekly free games list');
    const freeGamesSearchParams = {
      locale: 'en',
      country: 'US',
      allowCountries: 'US',
    };
    this.L.trace(
      { url: FREE_GAMES_PROMOTIONS_ENDPOINT, params: freeGamesSearchParams },
      'Getting free games list'
    );
    const resp = await this.request.get<PromotionsQueryResponse>(FREE_GAMES_PROMOTIONS_ENDPOINT, {
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
  async ownsGame(linkedOfferNs: string, linkedOfferId: string): Promise<boolean> {
    this.L.debug(
      {
        linkedOfferNs,
        linkedOfferId,
      },
      'Getting product ownership info'
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
    this.L.trace({ data, url: GRAPHQL_ENDPOINT }, 'Posting for offer entitlement');
    const entitlementResp = await this.request.post<ItemEntitlementResp>(GRAPHQL_ENDPOINT, {
      json: data,
    });
    if (entitlementResp.body.errors && entitlementResp.body.errors[0]) {
      const error = entitlementResp.body.errors[0];
      const errorJSON: AuthErrorJSON = JSON.parse(error.serviceResponse);
      if (errorJSON.errorCode.includes('authentication_failed')) {
        this.L.warn('Failed to authenticate with GraphQL API, trying again');
        const login = new Login(this.request, this.email);
        await login.refreshAndSid(true);
        return this.ownsGame(linkedOfferNs, linkedOfferId);
      }
      this.L.error(error);
      throw new Error(error.message);
    }
    this.L.trace({ resp: entitlementResp.body.data }, 'Entitlement response');
    const items = entitlementResp.body.data.Launcher.entitledOfferItems;
    return items.entitledToAllItemsInOffer && items.entitledToAnyItemInOffer;
  }

  async getPurchasableFreeGames(validOffers: Element[]): Promise<OfferInfo[]> {
    this.L.debug('Checking ownership on available games');
    const ownsGamePromises = validOffers.map(offer => {
      return this.ownsGame(offer.namespace, offer.id);
    });
    const ownsGames = await Promise.all(ownsGamePromises);
    const purchasableGames: OfferInfo[] = validOffers
      .filter((_offer, index) => {
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

  async updateIds(offers: Element[]): Promise<Element[]> {
    this.L.debug('Mapping IDs to offer');
    const promises = offers
      .map(async (offer, index) => {
        const productTypes = offer.categories.map(cat => cat.path);
        if (productTypes.includes('bundles')) {
          const url = `${STORE_CONTENT}/bundles/${offer.productSlug.split('/')[0]}`;
          this.L.trace({ url }, 'Fetching updated IDs');
          const bundlesResp = await this.request.get<BundlesContent>(url);
          return [
            {
              ...offers[index],
              id: bundlesResp.body.offer.id,
              namespace: bundlesResp.body.offer.namespace,
            },
          ];
        }
        if (productTypes.includes('games')) {
          // Call store content game page URL to get updated IDs for everything on the game page
          const url = `${STORE_CONTENT}/products/${offer.productSlug.split('/')[0]}`;
          this.L.trace({ url }, 'Fetching updated IDs');
          const productsResp = await this.request.get<ProductInfo>(url);

          // Call the catalog with the updated IDs to get price and discounts for all page items
          const offerRequest: (GraphQLBody | null)[] = productsResp.body.pages
            .map(page => {
              const query = `query catalogQuery($productNamespace: String!, $offerId: String!, $locale: String, $country: String!) { 
              Catalog { 
                catalogOffer(namespace: $productNamespace, id: $offerId, locale: $locale) { 
                  title 
                  id 
                  namespace 
                  description 
                  effectiveDate 
                  expiryDate 
                  isCodeRedemptionOnly 
                  productSlug 
                  urlSlug 
                  url 
                  items { 
                    id 
                    namespace 
                  } 
                  categories { 
                    path 
                  } 
                  price(country: $country) { 
                    totalPrice { 
                      discountPrice 
                      originalPrice 
                      voucherDiscount 
                      discount 
                      currencyCode 
                    } 
                  } 
                } 
              }
            }`;
              if (!(page.offer.hasOffer && page.offer.namespace && page.offer.id)) return null;
              const variables = {
                productNamespace: page.offer.namespace,
                offerId: page.offer.id,
                locale: 'en-US',
                country: 'US',
              };
              const data: GraphQLBody = { query, variables };
              return data;
            })
            .filter((elem): elem is GraphQLBody => elem !== null);
          this.L.trace({ offerRequest, url: GRAPHQL_ENDPOINT }, 'Posting for offer promotions');
          const offersResp = await this.request.post<OffersQueryResponse[]>(GRAPHQL_ENDPOINT, {
            json: offerRequest,
          });
          this.L.trace({ body: JSON.stringify(offersResp.body) }, 'Offers response');

          // Select the items with a 100% discount
          const freePromoOffers = offersResp.body.filter(
            promoOffer =>
              promoOffer.data.Catalog.catalogOffer.price.totalPrice.originalPrice ===
              promoOffer.data.Catalog.catalogOffer.price.totalPrice.discount
          );

          if (freePromoOffers.length === 0) {
            this.L.error(`Could not find free offer for ${offer.productSlug}`);
            return null;
          }

          return freePromoOffers.map(promoOffer => ({
            ...offers[index],
            id: promoOffer.data.Catalog.catalogOffer.id,
            namespace: promoOffer.data.Catalog.catalogOffer.namespace,
          }));
        }

        this.L.error(`Unrecognized productType: ${productTypes}`);
        return null;
      })
      .filter((elem): elem is Promise<Element[]> => elem !== null);
    const responses = (await Promise.all(promises)).flat();
    const uniqueResponses: Element[] = [];
    const map = new Map();
    // eslint-disable-next-line no-restricted-syntax
    for (const item of responses) {
      if (!map.has(item.id)) {
        map.set(item.id, true); // set any value to Map
        uniqueResponses.push(item);
      }
    }
    return uniqueResponses;
  }

  async getAllFreeGames(): Promise<OfferInfo[]> {
    let validFreeGames: Element[];
    if (config.onlyWeekly) {
      validFreeGames = await this.getWeeklyFreeGames();
    } else {
      validFreeGames = await this.getCatalogFreeGames();
    }
    this.L.info({ availableGames: validFreeGames.map(game => game.title) }, 'Available free games');
    const updatedOffers = await this.updateIds(validFreeGames);
    this.L.debug({ updatedOffers }, 'Offers with updated IDs');
    const purchasableGames = await this.getPurchasableFreeGames(updatedOffers);
    this.L.info(
      { purchasableGames: purchasableGames.map(game => game.productName) },
      'Unpurchased free games'
    );
    return purchasableGames;
  }
}
