import got, { Got, ToughCookieJar } from 'got';
import * as tough from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';
import fs from 'fs-extra';
import filenamify from 'filenamify';
import objectAssignDeep from 'object-assign-deep';
import { Protocol } from 'puppeteer';
import L from './logger';

export interface TCFSCookieAttributes {
  key: string;
  value: string;
  expires?: string;
  maxAge?: number;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  extensions?: string[];
  hostOnly: boolean;
  creation?: string;
  lastAccessed?: string;
}

export interface TCFSCookies {
  [cookieName: string]: TCFSCookieAttributes;
}

export interface TCFSPaths {
  [path: string]: TCFSCookies;
}

export interface ToughCookieFileStore {
  [site: string]: TCFSPaths;
}

export interface ETCCookie {
  domain: string;
  hostOnly: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: 'no_restriction' | 'unspecified';
  secure: boolean;
  session: boolean;
  storeId: string;
  value: string;
  id: number;
  expirationDate?: number;
}

export type EditThisCookie = ETCCookie[];

const cookieJars: Map<string, tough.CookieJar> = new Map();

function getCookieJar(username: string): tough.CookieJar {
  const fileSafeUsername = filenamify(username);
  let cookieJar = cookieJars.get(fileSafeUsername);
  if (cookieJar) {
    return cookieJar;
  }
  const cookieFilename = `./config/${fileSafeUsername}-cookies.json`;
  cookieJar = new tough.CookieJar(new FileCookieStore(cookieFilename));
  cookieJars.set(fileSafeUsername, cookieJar);
  return cookieJar;
}

export function editThisCookieToToughCookieFileStore(etc: EditThisCookie): ToughCookieFileStore {
  const COOKIE_WHITELIST = ['EPIC_SSO_RM', 'EPIC_SESSION_AP'];

  const tcfs: ToughCookieFileStore = {};
  etc.forEach((etcCookie) => {
    const domain = etcCookie.domain.replace(/^\./, '');
    const expires = etcCookie.expirationDate
      ? new Date(etcCookie.expirationDate * 1000).toISOString()
      : undefined;
    const { path, name } = etcCookie;

    if (COOKIE_WHITELIST.includes(name)) {
      const temp: ToughCookieFileStore = {
        [domain]: {
          [path]: {
            [name]: {
              key: name,
              value: etcCookie.value,
              expires,
              domain,
              path,
              secure: etcCookie.secure,
              httpOnly: etcCookie.httpOnly,
              hostOnly: etcCookie.hostOnly,
            },
          },
        },
      };
      L.debug({ tempCookie: temp });
      objectAssignDeep(tcfs, temp);
    }
  });
  L.debug({ convertedCookies: tcfs });
  return tcfs;
}

export default got.extend({
  cookieJar: getCookieJar('default') as ToughCookieJar,
  responseType: 'json',
});

export function newCookieJar(username: string): Got {
  const fileSafeUsername = filenamify(username);
  const cookieFilename = `./config/${fileSafeUsername}-cookies.json`;
  const fileExists = fs.existsSync(cookieFilename);
  if (fileExists) {
    const cookieTest = JSON.parse(fs.readFileSync(cookieFilename, 'utf8'));
    if (Array.isArray(cookieTest)) {
      L.info(`Converting ${cookieFilename} cookie format`);
      const tcfsCookies = editThisCookieToToughCookieFileStore(cookieTest);
      fs.writeFileSync(cookieFilename, JSON.stringify(tcfsCookies), 'utf8');
    }
  }

  return got.extend({
    cookieJar: getCookieJar(fileSafeUsername) as ToughCookieJar,
    responseType: 'json',
  });
}

export function getCookies(username: string): Record<string, string> {
  const fileSafeUsername = filenamify(username);
  const cookieJar = getCookieJar(fileSafeUsername);
  const { cookies } = cookieJar.toJSON();
  return cookies.reduce<Record<string, string>>(
    (accum, cookie) => ({ ...accum, [cookie.key]: cookie.value }),
    {}
  );
}

export async function getCookiesRaw(username: string): Promise<ToughCookieFileStore> {
  const fileSafeUsername = filenamify(username);
  const cookieFilename = `./config/${fileSafeUsername}-cookies.json`;
  try {
    const existingCookies: ToughCookieFileStore = await fs.readJSON(cookieFilename);
    return existingCookies;
  } catch (err) {
    return {};
  }
}

export function setCookie(username: string, key: string, value: string): void {
  const fileSafeUsername = filenamify(username);
  const cookieJar = getCookieJar(fileSafeUsername);
  cookieJar.setCookieSync(
    new tough.Cookie({
      key,
      value,
    }),
    '.epicgames.com'
  );
}

export function setPuppeteerCookies(username: string, newCookies: Protocol.Network.Cookie[]): void {
  const fileSafeUsername = filenamify(username);
  const cookieJar = getCookieJar(fileSafeUsername);
  newCookies.forEach((cookie) => {
    const domain = cookie.domain.replace(/^\./, '');
    const tcfsCookie = new tough.Cookie({
      key: cookie.name,
      value: cookie.value,
      expires: new Date(cookie.expires * 1000),
      domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      hostOnly: !cookie.domain.startsWith('.'),
    });
    cookieJar.setCookieSync(tcfsCookie, `https://${domain}`);
  });
}

export function deleteCookies(username?: string): void {
  if (username) {
    fs.unlinkSync(`./config/${username}-cookies.json`);
  } else {
    fs.unlinkSync(`./config/cookies.json`);
  }
}
