import { Got } from 'got';
import { Logger } from 'pino';
import logger from './common/logger';
import { OfferInfo } from './interfaces/types';
import { ItemEntitlementResp, AuthErrorJSON } from './interfaces/product-info';
import { GRAPHQL_ENDPOINT, FREE_GAMES_PROMOTIONS_ENDPOINT } from './common/constants';
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

  async getCatalogFreeGames(): Promise<OfferInfo[]> {
    this.L.debug('Getting global free games');
    const pageLimit = 1000;
    const nowTimestamp = new Date().toISOString();
    // variables and extensions can be found at https://www.epicgames.com/store/en-US/browse
    const variables = {
      allowCountries: 'US',
      category: 'games/edition/base|software/edition/base|editors|bundles/games|games',
      count: pageLimit,
      country: 'US',
      effectiveDate: `[,${nowTimestamp}]`,
      keywords: '',
      locale: 'en-US',
      onSale: true,
      releaseDate: `[,${nowTimestamp}]`,
      sortBy: 'releaseDate',
      sortDir: 'DESC',
      start: 0,
      tag: '',
      withPrice: true,
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '2e6ccea7014369002b60316358237b67eac979196633e53f8702143d076c91ef',
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
            return response.body.data.Catalog.searchStore.elements;
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
      locale: 'en',
      country: 'US',
      allowCountries: 'US',
    };
    this.L.trace({ url: FREE_GAMES_PROMOTIONS_ENDPOINT, searchParams }, 'Getting free games list');
    const resp = await this.request.get<PromotionsQueryResponse>(FREE_GAMES_PROMOTIONS_ENDPOINT, {
      searchParams,
    });
    const nowDate = new Date();
    const freeOfferedGames = resp.body.data.Catalog.searchStore.elements.filter((offer) => {
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
    const offersPromises: Promise<OfferInfo>[] = freeOfferedGames.map((game) =>
      this.getCatalogOffer(game.id, game.namespace)
    );
    const offers = await Promise.all(offersPromises);
    return offers;
  }

  // TODO: Parameterize region (en-US). Env var probably
  async ownsGame(offerId: string, namespace: string): Promise<boolean> {
    this.L.debug({ offerId, namespace }, 'Getting product ownership info');
    // variables and extensions can be found at https://www.epicgames.com/store/en-US
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
      if (errorJSON.errorCode.includes('authentication_failed')) {
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

  async getCatalogOffer(offerId: string, namespace: string): Promise<OfferInfo> {
    this.L.debug('Mapping IDs to offer');
    // variables and extensions can be found at https://www.epicgames.com/store/en-US
    const variables = {
      locale: 'en-US',
      country: 'US',
      offerId,
      sandboxId: namespace,
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '65c7fcd01d12a92b9a6977a2f802f3d4caf5038a4bf212ea2a029bebb94dbc86',
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
      validFreeGames = [
        ...(await this.getWeeklyFreeGames()),
        ...(await this.getCatalogFreeGames()),
      ];
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
