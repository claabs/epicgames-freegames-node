import { Got } from 'got';
import { Logger } from 'pino';
// import { outputJsonSync } from 'fs-extra';
import logger from './common/logger';
import { OfferInfo } from './interfaces/types';
import { ItemEntitlementResp, AuthErrorJSON, Offer, ProductInfo } from './interfaces/product-info';
import {
  GRAPHQL_ENDPOINT,
  FREE_GAMES_PROMOTIONS_ENDPOINT,
  STORE_CONTENT,
} from './common/constants';
import Login from './login';
import { config, SearchStrategy } from './common/config';
import {
  SearchStoreQueryResponse,
  Element as SearchStoreElement,
} from './interfaces/search-store-query-response';
import { PromotionsQueryResponse } from './interfaces/promotions-response';
import { GetCatalogOfferResponse } from './interfaces/get-catalog-offer-response';

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

  async getCatalogFreeGames(onSale = true): Promise<OfferInfo[]> {
    this.L.debug('Getting global free games');
    const pageLimit = 1000;
    const nowTimestamp = new Date().toISOString();
    // variables and extensions can be found at https://www.epicgames.com/store/en-US/browse
    // Search for "searchStoreQuery" in source HTML
    const variables = {
      allowCountries: 'US',
      category: 'games/edition/base|software/edition/base|editors|bundles/games',
      count: pageLimit,
      country: 'US',
      effectiveDate: onSale ? `[,${nowTimestamp}]` : undefined,
      keywords: '',
      locale: 'en-US',
      onSale: onSale ? true : undefined,
      sortBy: 'relevancy',
      sortDir: 'DESC',
      start: 0,
      tag: '',
      withPrice: true,
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '6e7c4dd0177150eb9a47d624be221929582df8648e7ec271c821838ff4ee148e',
      },
    };
    this.L.trace(
      { url: GRAPHQL_ENDPOINT, variables, extensions },
      'Posting for all games in catalog'
    );
    const items = await this.request.paginate.all<SearchStoreElement, SearchStoreQueryResponse>(
      GRAPHQL_ENDPOINT,
      {
        responseType: 'json',
        method: 'get',
        searchParams: {
          operationName: 'searchStoreQuery',
          variables: JSON.stringify(variables),
          extensions: JSON.stringify(extensions),
        },
        pagination: {
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          transform: (response) => {
            const elements = response.body?.data?.Catalog?.searchStore?.elements;
            if (!elements) {
              throw new Error(`Error paginating catalog data: ${JSON.stringify(response.body)}`);
            }
            return elements;
          },
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          paginate: (_response, _allItems, currentItems) => {
            if (currentItems.length < pageLimit) {
              return false;
            }
            const newVariables = variables;
            newVariables.start = variables.start + pageLimit;
            return {
              searchParams: {
                operationName: 'searchStoreQuery',
                variables: JSON.stringify(newVariables),
                extensions: JSON.stringify(extensions),
              },
            };
          },
        },
      }
    );
    this.L.debug(`Retrieved catalog data for ${items.length} games`);
    // outputJsonSync('hars/catalog.json', items);
    const freeGames = items.filter((game) => {
      return game.price?.totalPrice?.discountPrice === 0;
    });
    this.L.trace(`Found ${freeGames.length} free games in catalog`);
    const uniqueFreeGames: SearchStoreElement[] = [];
    const map = new Map();
    // eslint-disable-next-line no-restricted-syntax
    for (const item of freeGames) {
      if (!map.has(item.productSlug)) {
        map.set(item.productSlug, true); // set any value to Map
        uniqueFreeGames.push(item);
      }
    }
    this.L.debug(`Found ${uniqueFreeGames.length} unique free games in catalog`);
    const offers: OfferInfo[] = uniqueFreeGames.map((game) => ({
      offerId: game.id,
      offerNamespace: game.namespace,
      productName: game.title,
      productSlug: game.productSlug || game.urlSlug,
    }));
    this.L.trace({ offers }, 'Free games in catalog');
    return offers;
  }

  async getWeeklyFreeGames(): Promise<OfferInfo[]> {
    this.L.debug('Getting current weekly free games list');
    const searchParams = {
      locale: 'en-US',
      country: 'US',
      allowCountries: 'US',
    };
    this.L.trace({ url: FREE_GAMES_PROMOTIONS_ENDPOINT, searchParams }, 'Getting free games list');
    const resp = await this.request.get<PromotionsQueryResponse>(FREE_GAMES_PROMOTIONS_ENDPOINT, {
      searchParams,
    });
    const nowDate = new Date();
    const elements = resp.body?.data?.Catalog?.searchStore?.elements;
    if (!elements) {
      throw new Error(`Error parsing free games data: ${JSON.stringify(resp.body)}`);
    }
    const freeOfferedGames = elements.filter((offer) => {
      let r = false;
      if (offer.promotions) {
        offer.promotions.promotionalOffers.forEach((innerOffers) => {
          innerOffers.promotionalOffers.forEach((pOffer) => {
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
    // The id/namespace we have here is not necessarily the actual product on sale.
    // We need to lookup the product by its slug to get all its offers
    const allProductOffers: OfferInfo[] = (
      await Promise.all(
        freeOfferedGames.map(async (game) => {
          if (!game.productSlug) {
            return [
              {
                offerNamespace: game.namespace,
                offerId: game.id,
                productName: game.title,
                productSlug: game.productSlug,
              },
            ];
          }
          const productOffers = await this.getProduct(game.productSlug);
          return productOffers
            .filter((o) => o.hasOffer)
            .map((o) => ({
              offerNamespace: o.namespace,
              offerId: o.id,
              productName: game.title,
              productSlug: game.productSlug,
            }));
        })
      )
    ).flat();
    // Then we need to query each offer for its details so we can find its discount
    // Then we filter to only the free offers
    const freeOffers: OfferInfo[] = (
      await Promise.all(
        allProductOffers.map(async (offer) =>
          this.getFreeCatalogOffer(offer.offerId, offer.offerNamespace)
        )
      )
    ).filter((offer): offer is OfferInfo => offer !== undefined);
    return freeOffers;
  }

  async getProduct(productSlug: string): Promise<Offer[]> {
    this.L.debug({ productSlug }, 'Getting product info using productSlug');
    const url = `${STORE_CONTENT}/products/${productSlug}`;
    this.L.trace({ url }, 'Getting product info');
    const entitlementResp = await this.request.get<ProductInfo>(url);
    const offers = entitlementResp.body.pages.map((page) => page.offer);
    return offers;
  }

  // TODO: Parameterize region (en-US). Env var probably
  async ownsGame(offerId: string, namespace: string): Promise<boolean> {
    this.L.debug({ offerId, namespace }, 'Getting product ownership info');
    // variables and extensions can be found at https://www.epicgames.com/store/en-US
    // Search for "getEntitledOfferItems" in source HTML
    const variables = {
      offerId,
      sandboxId: namespace,
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '803d00fd80aef2cbb0b998ba27b761143d228195b86cc8af55e73002f18a1678',
      },
    };
    this.L.trace({ url: GRAPHQL_ENDPOINT, variables, extensions }, 'Posting for offer entitlement');
    const entitlementResp = await this.request.get<ItemEntitlementResp>(GRAPHQL_ENDPOINT, {
      searchParams: {
        operationName: 'getEntitledOfferItems',
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions),
      },
    });
    if (entitlementResp.body.errors && entitlementResp.body.errors[0]) {
      const error = entitlementResp.body.errors[0];
      const errorJSON: AuthErrorJSON = JSON.parse(error.serviceResponse);
      if (errorJSON.errorCode?.includes('authentication_failed')) {
        this.L.warn('Failed to authenticate with GraphQL API, trying again');
        const login = new Login(this.request, this.email);
        await login.refreshAndSid(true);
        return this.ownsGame(offerId, namespace);
      }
      this.L.error(error);
      throw new Error(error.message);
    }
    this.L.trace({ resp: entitlementResp.body.data }, 'Entitlement response');
    const items = entitlementResp.body.data.Launcher.entitledOfferItems;
    return items.entitledToAllItemsInOffer && items.entitledToAnyItemInOffer;
  }

  async getPurchasableFreeGames(offers: OfferInfo[]): Promise<OfferInfo[]> {
    this.L.debug('Checking ownership on available games');
    const ownsGamePromises = offers.map((offer) => {
      return this.ownsGame(offer.offerId, offer.offerNamespace);
    });
    const ownsGames = await Promise.all(ownsGamePromises);
    const purchasableGames: OfferInfo[] = offers.filter((_offer, index) => {
      return !ownsGames[index];
    });
    return purchasableGames;
  }

  /**
   * Gets the details of an offer, only returns if it's free
   */
  async getFreeCatalogOffer(offerId: string, namespace: string): Promise<OfferInfo | undefined> {
    this.L.trace({ offerId, namespace }, 'Getting offer details');
    // variables and extensions can be found at https://www.epicgames.com/store/en-US
    // Search for "getCatalogOffer" in source HTML
    const variables = {
      locale: 'en-US',
      country: 'US',
      offerId,
      sandboxId: namespace,
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '3fe02aae98bea508d894173f8bcd8a379f0959ff4b3e1bd2c31183260578922a',
      },
    };
    this.L.trace({ url: GRAPHQL_ENDPOINT, variables, extensions }, 'Posting for catalog offer');
    const offerResponse = await this.request.get<GetCatalogOfferResponse>(GRAPHQL_ENDPOINT, {
      searchParams: {
        operationName: 'getCatalogOffer',
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions),
      },
    });
    const offer = offerResponse.body.data.Catalog.catalogOffer;
    const isFree = offer.price?.totalPrice?.discountPrice === 0;
    this.L.trace({ offerId, namespace, isFree });
    if (!isFree) {
      return undefined;
    }
    return {
      offerId: offer.id,
      offerNamespace: offer.namespace,
      productName: offer.title,
      productSlug: offer.productSlug,
    };
  }

  async getAllFreeGames(): Promise<OfferInfo[]> {
    let validFreeGames: OfferInfo[];
    if (config.searchStrategy === SearchStrategy.WEEKLY) {
      validFreeGames = await this.getWeeklyFreeGames();
    } else if (config.searchStrategy === SearchStrategy.PROMOTION) {
      validFreeGames = await this.getCatalogFreeGames();
    } else {
      this.L.info('searchStrategy is `all`: searching for weekly and promotional games');
      let weeklyFreeGames: OfferInfo[] | null = null;
      let catalogFreeGames: OfferInfo[] | null = null;
      try {
        weeklyFreeGames = await this.getWeeklyFreeGames();
      } catch (err) {
        this.L.warn(err, 'Failed to lookup weekly free games');
      }
      try {
        catalogFreeGames = await this.getCatalogFreeGames();
      } catch (err) {
        this.L.warn(err, 'Failed to lookup catalog free games');
      }
      if (weeklyFreeGames === null && catalogFreeGames === null) {
        throw new Error('Both free game API lookups failed');
      }
      validFreeGames = [...(weeklyFreeGames || []), ...(catalogFreeGames || [])];
      this.L.trace({ dupedFreeGames: validFreeGames });
      // dedupe
      validFreeGames = validFreeGames.filter(
        (e, i) => validFreeGames.findIndex((a) => a.offerId === e.offerId) === i
      );
    }
    this.L.info(
      { availableGames: validFreeGames.map((game) => game.productName) },
      'Available free games'
    );
    const purchasableGames = await this.getPurchasableFreeGames(validFreeGames);
    this.L.info(
      { purchasableGames: purchasableGames.map((game) => game.productName) },
      'Unpurchased free games'
    );
    return purchasableGames;
  }
}
