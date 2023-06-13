import * as tough from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';
import fs from 'fs-extra';
import filenamify from 'filenamify';
import objectAssignDeep from 'object-assign-deep';
import { Protocol } from 'puppeteer';
import path from 'path';
import L from './logger';
import { CONFIG_DIR } from './config';

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

const DEFAULT_COOKIE_NAME = 'default';

const cookieJars: Map<string, tough.CookieJar> = new Map();

function getCookiePath(username: string): string {
  const fileSafeUsername = filenamify(username);
  const cookieFilename = path.join(CONFIG_DIR, `${fileSafeUsername}-cookies.json`);
  return cookieFilename;
}

function getCookieJar(username: string): tough.CookieJar {
  let cookieJar = cookieJars.get(username);
  if (cookieJar) {
    return cookieJar;
  }
  const cookieFilename = getCookiePath(username);
  cookieJar = new tough.CookieJar(new FileCookieStore(cookieFilename));
  cookieJars.set(username, cookieJar);
  return cookieJar;
}

export function editThisCookieToToughCookieFileStore(etc: EditThisCookie): ToughCookieFileStore {
  const COOKIE_WHITELIST = ['EPIC_SSO_RM', 'EPIC_SESSION_AP', 'EPIC_DEVICE'];

  const tcfs: ToughCookieFileStore = {};
  etc.forEach((etcCookie) => {
    const domain = etcCookie.domain.replace(/^\./, '');
    const expires = etcCookie.expirationDate
      ? new Date(etcCookie.expirationDate * 1000).toISOString()
      : undefined;
    const { path: cookiePath, name } = etcCookie;

    if (COOKIE_WHITELIST.includes(name)) {
      const temp: ToughCookieFileStore = {
        [domain]: {
          [cookiePath]: {
            [name]: {
              key: name,
              value: etcCookie.value,
              expires,
              domain,
              path: cookiePath,
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

export function getCookies(username: string): Record<string, string> {
  const cookieJar = getCookieJar(username);
  const { cookies } = cookieJar.toJSON();
  return cookies.reduce<Record<string, string>>(
    (accum, cookie) => ({ ...accum, [cookie.key]: cookie.value }),
    {}
  );
}

export async function getCookiesRaw(username: string): Promise<ToughCookieFileStore> {
  const cookieFilename = getCookiePath(username);
  try {
    const existingCookies: ToughCookieFileStore = await fs.readJSON(cookieFilename);
    return existingCookies;
  } catch (err) {
    return {};
  }
}

export function setCookie(username: string, key: string, value: string): void {
  const cookieJar = getCookieJar(username);
  cookieJar.setCookieSync(
    new tough.Cookie({
      key,
      value,
    }),
    '.epicgames.com'
  );
}

export function setPuppeteerCookies(username: string, newCookies: Protocol.Network.Cookie[]): void {
  const cookieJar = getCookieJar(username);
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
    try {
      cookieJar.setCookieSync(tcfsCookie, `https://${domain}`);
    } catch (err) {
      L.error({ tcfsCookie }, 'Error setting cookie');
      throw err;
    }
  });
}

export function deleteCookies(username?: string): void {
  if (username) {
    const cookieFilename = getCookiePath(username);
    fs.unlinkSync(cookieFilename);
  } else {
    const cookieFilename = getCookiePath(DEFAULT_COOKIE_NAME);
    fs.unlinkSync(cookieFilename);
  }
}

export function convertImportCookies(username: string): void {
  const cookieFilename = getCookiePath(username);
  const fileExists = fs.existsSync(cookieFilename);
  if (fileExists) {
    let cookieData;
    try {
      cookieData = fs.readFileSync(cookieFilename, 'utf8');
      const cookieTest = JSON.parse(cookieData);
      if (Array.isArray(cookieTest)) {
        L.info(`Converting ${cookieFilename} cookie format`);
        const tcfsCookies = editThisCookieToToughCookieFileStore(cookieTest);
        fs.writeFileSync(cookieFilename, JSON.stringify(tcfsCookies), 'utf8');
      }
    } catch (err) {
      L.warn(err);
      L.warn({ cookieData }, `Could not parse ${cookieFilename}, deleting it`);
      fs.rmSync(cookieFilename, { force: true });
    }
  }
}

export function userHasValidCookie(username: string, cookieName: string): boolean {
  const cookieFilename = getCookiePath(username);
  const fileExists = fs.existsSync(cookieFilename);
  if (fileExists) {
    try {
      const cookieData: ToughCookieFileStore = fs.readJSONSync(cookieFilename, 'utf8');
      const rememberCookieExpireDate = cookieData['epicgames.com']?.['/']?.[cookieName]?.expires;
      if (!rememberCookieExpireDate) return false;
      return new Date(rememberCookieExpireDate) > new Date();
    } catch (err) {
      L.warn(err);
    }
  }
  return false;
}
