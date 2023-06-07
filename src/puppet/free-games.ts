import { Page } from 'puppeteer';
import {
  FREE_GAMES_PROMOTIONS_ENDPOINT,
  GRAPHQL_ENDPOINT,
  STORE_CART_EN,
  STORE_CONTENT,
} from '../common/constants';
import { config, SearchStrategy } from '../common/config';
import PuppetBase from './base';
import { OfferInfo } from '../interfaces/types';
import { GetCatalogOfferResponse } from '../interfaces/get-catalog-offer-response';
import {
  GraphQLErrorResponse,
  Offer,
  ProductInfo,
  Page as ProductInfoPage,
} from '../interfaces/product-info';
import { PromotionsQueryResponse } from '../interfaces/promotions-response';
import {
  SearchStoreQueryResponse,
  Element as SearchStoreElement,
} from '../interfaces/search-store-query-response';
import { OffersValidationResponse } from '../interfaces/offers-validation';
import { PageSlugMappingResponse, PageSlugMappingResult } from '../interfaces/page-slug-mapping';

export default class PuppetFreeGames extends PuppetBase {
  private page?: Page;

  private async request<T = unknown>(
    method: string,
    url: string,
    params?: Record<string, string>
  ): Promise<T> {
    if (!this.page) {
      this.page = await this.setupPage();
      await this.page.goto(STORE_CART_EN, { waitUntil: 'networkidle0' });
    }

    let fetchUrl: URL;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fetchUrl = new URL(`${url}?${searchParams}`);
    } else {
      fetchUrl = new URL(url);
    }
    const resp = await this.page.evaluate(
      async (inFetchUrl: string, inMethod: string) => {
        const response = await fetch(inFetchUrl, {
          method: inMethod,
        });
        const json: T = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(json));
        return json;
      },
      fetchUrl.toString(),
      method
    );
    return resp;
  }

  async getCatalogFreeGames(onSale = true): Promise<OfferInfo[]> {
    this.L.debug('Getting global free games');
    const pageLimit = 1000;
    const nowTimestamp = new Date().toISOString();
    // variables and extensions can be found at https://store.epicgames.com/en-US/browse
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
        sha256Hash: '7d58e12d9dd8cb14c84a3ff18d360bf9f0caa96bf218f2c5fda68ba88d68a437',
      },
    };
    this.L.trace(
      { url: GRAPHQL_ENDPOINT, variables, extensions },
      'Posting for all games in catalog'
    );

    // Paginate through the GraphQL API responses
    let keepGoing = true;
    const items: SearchStoreElement[] = [];
    do {
      // eslint-disable-next-line no-await-in-loop
      const responseBody = await this.request<SearchStoreQueryResponse>('GET', GRAPHQL_ENDPOINT, {
        operationName: 'searchStoreQuery',
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions),
      });
      const elements = responseBody.data?.Catalog?.searchStore?.elements;
      if (!elements) {
        throw new Error(`Error paginating catalog data: ${JSON.stringify(responseBody)}`);
      }
      items.push(...elements);
      keepGoing = elements.length === pageLimit;
      if (keepGoing) {
        variables.start += pageLimit;
      }
    } while (keepGoing);

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
    const body = await this.request<PromotionsQueryResponse>(
      'GET',
      FREE_GAMES_PROMOTIONS_ENDPOINT,
      searchParams
    );
    const nowDate = new Date();
    const elements = body.data?.Catalog?.searchStore?.elements;
    if (!elements) {
      throw new Error(`Error parsing free games data: ${JSON.stringify(body)}`);
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
          let pageSlug =
            game?.catalogNs?.mappings?.find((mapping) => mapping.pageType === 'productHome')
              ?.pageSlug || game.productSlug;
          const { productSlug, offerType } = game;
          let { id: offerId, namespace } = game;

          if (pageSlug && productSlug) {
            const mappingResp = await this.getPageSlugMapping(pageSlug);
            if (typeof mappingResp === 'string') {
              // Older CMS product lookup strategy
              pageSlug = mappingResp;
              const productOffers = await this.getCmsProduct(pageSlug, offerType);
              return productOffers
                .filter((o) => o.hasOffer)
                .map((o) => ({
                  offerNamespace: o.namespace,
                  offerId: o.id,
                  productName: game.title,
                  productSlug: pageSlug,
                }));
            }
            // Newer catalog lookup strategy (Bloons TD6)
            offerId = mappingResp.offerId;
            namespace = mappingResp.namespace;
          }
          return [
            {
              offerNamespace: namespace,
              offerId,
              productName: game.title,
              productSlug: pageSlug,
            },
          ];
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

  async getPageSlugMapping(pageSlug: string): Promise<PageSlugMappingResult | string> {
    this.L.debug({ pageSlug }, 'Getting product info using pageSlug');
    const variables = {
      pageSlug,
      locale: 'en-US',
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '781fd69ec8116125fa8dc245c0838198cdf5283e31647d08dfa27f45ee8b1f30',
      },
    };
    this.L.trace({ url: GRAPHQL_ENDPOINT, variables, extensions }, 'Posting for pageSlug mapping');
    const resp = await this.request<PageSlugMappingResponse>('GET', GRAPHQL_ENDPOINT, {
      operationName: 'getMappingByPageSlug',
      variables: JSON.stringify(variables),
      extensions: JSON.stringify(extensions),
    });
    const storePageMapping = resp.data.StorePageMapping.mapping;
    this.L.debug({ pageSlug, storePageMapping }, 'Page slug response');
    if (storePageMapping.mappings.offer) {
      return {
        namespace: storePageMapping.mappings.offer.namespace,
        offerId: storePageMapping.mappings.offer.id,
      };
    }
    return storePageMapping.pageSlug;
  }

  async getCmsProduct(productSlug: string, offerType?: 'BUNDLE' | string): Promise<Offer[]> {
    const isBundle = offerType === 'BUNDLE';
    this.L.debug({ productSlug, offerType }, 'Getting product info using productSlug');
    const itemPath = isBundle ? 'bundles' : 'products';
    const url = `${STORE_CONTENT}/${itemPath}/${productSlug}`;
    this.L.trace({ url }, 'Getting product info');

    if (isBundle) {
      const productInfoRespBody = await this.request<ProductInfoPage>('GET', url);
      const offers = [productInfoRespBody.offer];
      return offers;
    }
    const productInfoRespBody = await this.request<ProductInfo>('GET', url);
    const offers = productInfoRespBody.pages.map((page) => page.offer);
    return offers;
  }

  async canPurchase(offerId: string, namespace: string): Promise<boolean> {
    this.L.debug({ offerId, namespace }, 'Getting offers validation info');
    // variables and extensions can be found at https://store.epicgames.com/en-US/
    // Search for "getOffersValidation" in source HTML
    const variables = {
      offers: [
        {
          offerId,
          namespace,
        },
      ],
    };
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '3c9bb0f213f6d0cb6bf056e6b206ba166c8dd59d014618e4d59bff11689f403a',
      },
    };
    this.L.trace({ url: GRAPHQL_ENDPOINT, variables, extensions }, 'Posting for offers validation');
    const entitlementRespBody = await this.request<OffersValidationResponse | GraphQLErrorResponse>(
      'GET',
      GRAPHQL_ENDPOINT,
      {
        operationName: 'getOffersValidation',
        variables: JSON.stringify(variables),
        extensions: JSON.stringify(extensions),
      }
    );
    if ('errors' in entitlementRespBody) {
      this.L.debug(entitlementRespBody.errors);
      throw new Error(entitlementRespBody.errors[0].message);
    }
    const validations = entitlementRespBody.data?.Entitlements?.cartOffersValidation;
    this.L.debug({ offerId, namespace, validations }, 'Offers validation response');
    if (
      validations?.missingPrerequisites?.length ||
      validations?.conflictingOffers?.length ||
      validations?.fullyOwnedOffers?.length ||
      validations?.unablePartiallyUpgradeOffers?.length
    )
      return false;
    return true;
  }

  async getPurchasableFreeGames(offers: OfferInfo[]): Promise<OfferInfo[]> {
    this.L.debug('Checking ownership and prerequesites on available games');
    const canPurchaseSet = await Promise.all(
      offers.map((offer) => {
        return this.canPurchase(offer.offerId, offer.offerNamespace);
      })
    );
    const purchasableGames: OfferInfo[] = offers.filter((_offer, index) => {
      return canPurchaseSet[index];
    });
    return purchasableGames;
  }

  /**
   * Gets the details of an offer, only returns if it's free
   */
  async getFreeCatalogOffer(offerId: string, namespace: string): Promise<OfferInfo | undefined> {
    this.L.trace({ offerId, namespace }, 'Getting offer details');
    // variables and extensions can be found at https://store.epicgames.com/en-US/
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
        sha256Hash: '6797fe39bfac0e6ea1c5fce0ecbff58684157595fee77e446b4254ec45ee2dcb',
      },
    };
    this.L.trace({ url: GRAPHQL_ENDPOINT, variables, extensions }, 'Posting for catalog offer');
    const offerResponseBody = await this.request<GetCatalogOfferResponse>('GET', GRAPHQL_ENDPOINT, {
      operationName: 'getCatalogOffer',
      variables: JSON.stringify(variables),
      extensions: JSON.stringify(extensions),
    });
    const offer = offerResponseBody.data.Catalog.catalogOffer;
    const isBlacklisted = offer.countriesBlacklist?.includes(
      config.countryCode?.toUpperCase() || ''
    );
    const isFree = offer.price?.totalPrice?.discountPrice === 0;
    this.L.trace({ offerId, namespace, isFree, isBlacklisted });
    if (!isFree || isBlacklisted) {
      return undefined;
    }

    // HACK: fix for "Knockout City Cross-Play Beta"
    if (offer.productSlug?.endsWith('/beta')) return undefined;

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
    if (this.page) await this.page.close();
    return purchasableGames;
  }
}
