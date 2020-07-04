import got, { Got } from 'got';
import * as tough from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';
import fs from 'fs';
import filenamify from 'filenamify';

export default got.extend({
  cookieJar: new tough.CookieJar(new FileCookieStore(`./config/cookies.json`)),
  responseType: 'json',
});

export function newCookieJar(username: string): Got {
  const fileSafeUsername = filenamify(username);
  return got.extend({
    cookieJar: new tough.CookieJar(
      new FileCookieStore(`./config/${fileSafeUsername}-cookies.json`)
    ),
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
