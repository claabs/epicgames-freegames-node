import got, { Got } from 'got';
import * as tough from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';
import fs from 'fs';
import filenamify from 'filenamify';
import objectAssignDeep from 'object-assign-deep';
import L from './logger';

export function editThisCookieToToughCookieFileStore(etc: EditThisCookie): ToughCookieFileStore {
  const tcfs: ToughCookieFileStore = {};
  etc.forEach(etcCookie => {
    const domain = etcCookie.domain.replace(/^\./, '');
    const expires = etcCookie.expirationDate
      ? new Date(etcCookie.expirationDate * 1000).toISOString()
      : undefined;
    const { path, name } = etcCookie;

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
    objectAssignDeep(tcfs, temp);
  });
  return tcfs;
}

export default got.extend({
  cookieJar: new tough.CookieJar(new FileCookieStore(`./config/cookies.json`)),
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
    cookieJar: new tough.CookieJar(new FileCookieStore(cookieFilename)),
    responseType: 'json',
  });
}

export function deleteCookies(username?: string): void {
  if (username) {
    fs.unlinkSync(`./config/${username}-cookies.json`);
  } else {
    fs.unlinkSync(`./config/cookies.json`);
  }
}
export interface ToughCookieFileStore {
  [site: string]: TCFSPaths;
}

export interface TCFSPaths {
  [site: string]: TCFSCookies;
}

export interface TCFSCookies {
  [cookieName: string]: TCFSCookieAttributes;
}

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

export type EditThisCookie = ETCCookie[];
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
