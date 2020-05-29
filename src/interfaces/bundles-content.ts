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

export interface ProductLinks {
  _type: string;
}

export interface SocialLinks {
  linkTwitter: string;
  linkTwitch: string;
  linkFacebook: string;
  linkYoutube: string;
  _type: string;
  linkDiscord: string;
  title: string;
  linkInstagram: string;
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

export interface LegalTag {
  countryCodes: string;
  visibility: string;
  src: string;
  _type: string;
  title: string;
}

export interface Rating {
  _type: string;
}

export interface Requirements {
  languages: string[];
  systems: System[];
  legalTags: LegalTag[];
  accountRequirements: string;
  _type: string;
  rating: Rating;
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
}

export interface Logo {
  src: string;
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

export interface Image {
  src: string;
  _type: string;
}

export interface DeveloperLogo {
  _type: string;
}

export interface About {
  image: Image;
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

export interface Image2 {
  src: string;
  _type: string;
}

export interface Link2 {
  src: string;
  _type: string;
  title: string;
}

export interface Item {
  image: Image2;
  _type: string;
  link: Link2;
  description: string;
  title: string;
}

export interface Includes {
  _type: string;
  items: Item[];
}

export interface Image3 {
  src: string;
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

export interface Item2 {
  image: Image3;
  _type: string;
  video: Video;
}

export interface Carousel {
  _type: string;
  items: Item2[];
}

export interface Image4 {
  _type: string;
}

export interface Twitter {
  _type: string;
}

export interface Og {
  _type: string;
}

export interface Seo {
  image: Image4;
  twitter: Twitter;
  _type: string;
  og: Og;
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
  footer: Footer;
  meta: Meta;
  _type: string;
  about: About;
  banner: Banner;
  includes: Includes;
  carousel: Carousel;
  seo: Seo;
  gallery: Gallery;
}

export interface AgeGate {
  hasAgeGate: boolean;
  _type: string;
}

export interface Theme {
  buttonPrimaryBg: string;
  customPrimaryBg: string;
  accentColor: string;
  _type: string;
  colorScheme: string;
}

export interface BundlesContent {
  offer: Offer;
  'jcr:isCheckedOut': boolean;
  data: Data;
  hideMeta: boolean;
  namespace: string;
  _title: string;
  ageGate: AgeGate;
  theme: Theme;
  regionBlock: string;
  _noIndex: boolean;
  _images_: string[];
  'jcr:baseVersion': string;
  _urlPattern: string;
  _slug: string;
  _activeDate: Date;
  lastModified: Date;
  _locale: string;
  _id: string;
}
