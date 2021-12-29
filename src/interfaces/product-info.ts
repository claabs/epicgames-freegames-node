export interface Image {
  src: string;
  _type: string;
}

export interface Rating {
  image: Image;
  countryCodes: string;
  _type: string;
  title: string;
}

export interface ProductRatings {
  ratings: Rating[];
  _type: string;
}

export interface Theme {
  buttonPrimaryBg: string;
  accentColor: string;
  _type: string;
  colorScheme: string;
}

export interface ExternalNavLinks {
  _type: string;
}

export interface Image2 {
  src: string;
  _type: string;
}

export interface Rating2 {
  image: Image2;
  countryCodes: string;
  _type: string;
  title: string;
}

export interface ProductRatings2 {
  ratings: Rating2[];
  _type: string;
}

export interface Theme2 {
  buttonPrimaryBg: string;
  accentColor: string;
  _type: string;
  colorScheme: string;
}

export interface ExternalNavLinks2 {
  _type: string;
}

export interface RegionRestrictions {
  _type: string;
}

export interface Offer {
  regionRestrictions: RegionRestrictions;
  _type: string;
  namespace: string;
  id: string;
  hasOffer: boolean;
}

export interface Item {
  _type: string;
  namespace: string;
  hasItem: boolean;
}

export interface ProductLinks {
  _type: string;
}

export interface SocialLinks {
  _type: string;
  linkHomepage: string;
}

export interface Detail {
  _type: string;
  title: string;
  minimum: string;
  recommended: string;
}

export interface System {
  _type: string;
  systemType: string;
  details: Detail[];
}

export interface Rating3 {
  _type: string;
}

export interface Requirements {
  systems: System[];
  _type: string;
  rating: Rating3;
}

export interface PrivacyPolicyLink {
  src: string;
  _type: string;
  title: string;
}

export interface Footer {
  _type: string;
  copy: string;
  privacyPolicyLink: PrivacyPolicyLink;
  src: string;
  title: string;
}

export interface Image3 {
  src: string;
  _type: string;
}

export interface DeveloperLogo {
  _type: string;
}

export interface About {
  image: Image3;
  developerAttribution: string;
  _type: string;
  publisherAttribution: string;
  description: string;
  shortDescription: string;
  title: string;
  developerLogo: DeveloperLogo;
}

export interface Link {
  _type: string;
}

export interface Banner {
  showPromotion: boolean;
  _type: string;
  link: Link;
}

export interface LogoImage {
  src: string;
  _type: string;
}

export interface Action {
  _type: string;
}

export interface Video {
  loop: boolean;
  _type: string;
  hasFullScreen: boolean;
  hasControls: boolean;
  muted: boolean;
  autoplay: boolean;
}

export interface Hero {
  logoImage: LogoImage;
  portraitBackgroundImageUrl: string;
  _type: string;
  action: Action;
  video: Video;
  isFullBleed: boolean;
  altContentPosition: boolean;
  backgroundImageUrl: string;
}

export interface Image4 {
  src: string;
  _type: string;
}

export interface Video2 {
  loop: boolean;
  _type: string;
  hasFullScreen: boolean;
  hasControls: boolean;
  muted: boolean;
  autoplay: boolean;
}

export interface Item2 {
  image: Image4;
  _type: string;
  video: Video2;
}

export interface Carousel {
  _type: string;
  items: Item2[];
}

export interface RegionRestrictions2 {
  _type: string;
}

export interface Image5 {
  src: string;
  _type: string;
}

export interface Edition {
  regionRestrictions: RegionRestrictions2;
  image: Image5;
  _type: string;
  namespace: string;
  description: string;
  offerId: string;
  tag: string;
  title: string;
  slug: string;
}

export interface Editions {
  _type: string;
  enableImages: boolean;
  editions: Edition[];
}

export interface Logo {
  _type: string;
}

export interface Meta {
  releaseDate: Date;
  _type: string;
  publisher: string[];
  logo: Logo;
  developer: string[];
  platform: string[];
  tags: string[];
}

export interface Markdown {
  _type: string;
}

export interface RegionRestrictions3 {
  _type: string;
}

export interface ContingentOffer {
  regionRestrictions: RegionRestrictions3;
  _type: string;
  hasOffer: boolean;
}

export interface RegionRestrictions4 {
  _type: string;
}

export interface Image6 {
  src: string;
  _type: string;
}

export interface Dlc2 {
  regionRestrictions: RegionRestrictions4;
  image: Image6;
  _type: string;
  namespace: string;
  description: string;
  offerId: string;
  tag: string;
  title: string;
  type: string;
  slug: string;
}

export interface Dlc {
  contingentOffer: ContingentOffer;
  _type: string;
  enableImages: boolean;
  dlc: Dlc2[];
}

export interface Image7 {
  _type: string;
}

export interface Twitter {
  _type: string;
}

export interface Og {
  _type: string;
}

export interface Seo {
  image: Image7;
  twitter: Twitter;
  _type: string;
  og: Og;
}

export interface ProductSection {
  productSection: string;
  _type: string;
}

export interface GalleryImage {
  src: string;
  _type: string;
  row: number;
}

export interface Gallery {
  _type: string;
  galleryImages: GalleryImage[];
}

export interface Data {
  productLinks: ProductLinks;
  socialLinks: SocialLinks;
  requirements: Requirements;
  navOrder: number;
  footer: Footer;
  _type: string;
  about: About;
  banner: Banner;
  hero: Hero;
  carousel: Carousel;
  editions: Editions;
  meta: Meta;
  markdown: Markdown;
  dlc: Dlc;
  seo: Seo;
  productSections: ProductSection[];
  gallery: Gallery;
  navTitle: string;
}

export interface AgeGate {
  hasAgeGate: boolean;
  _type: string;
}

export interface Page {
  productRatings: ProductRatings2;
  'jcr:isCheckedOut': boolean;
  modMarketplaceEnabled: boolean;
  namespace: string;
  _title: string;
  theme: Theme2;
  regionBlock: string;
  _noIndex: boolean;
  _images_: string[];
  productName: string;
  'jcr:baseVersion': string;
  externalNavLinks: ExternalNavLinks2;
  _urlPattern: string;
  _slug: string;
  _activeDate: Date;
  lastModified: Date;
  _locale: string;
  _id: string;
  offer: Offer;
  item: Item;
  data: Data;
  pageRegionBlock: string;
  ageGate: AgeGate;
  type: string;
  tag: string;
}

export interface ProductInfo {
  productRatings: ProductRatings;
  'jcr:isCheckedOut': boolean;
  modMarketplaceEnabled: boolean;
  namespace: string;
  _title: string;
  theme: Theme;
  regionBlock: string;
  _noIndex: boolean;
  _images_: string[];
  productName: string;
  'jcr:baseVersion': string;
  externalNavLinks: ExternalNavLinks;
  _urlPattern: string;
  _slug: string;
  _activeDate: Date;
  lastModified: Date;
  _locale: string;
  _id: string;
  pages: Page[];
}

export interface GraphQLError {
  message: string;
  correlationId: string;
  serviceResponse: string;
  stack: null;
}

export interface ItemEntitlementResp {
  errors?: GraphQLError[];
  data: {
    Launcher: {
      entitledOfferItems: {
        namespace: string;
        offerId: string;
        entitledToAllItemsInOffer: boolean;
        entitledToAnyItemInOffer: boolean;
      };
    };
  };
}

export interface AuthErrorJSON {
  errorCode?: string;
  errorMessage: string;
  messageVars: string[];
  numericErrorCode: number;
  originatingService: string;
  intent: string;
  errorStatus: number;
}
