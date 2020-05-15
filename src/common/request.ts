import got from 'got';
import * as tough from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';
import fs from 'fs';

export default class Request {
  public static client = got.extend({
    cookieJar: new tough.CookieJar(new FileCookieStore(`./config/cookies.json`)),
    responseType: 'json',
  });

  public static newCookieJar(username: string): void {
    this.client = got.extend({
      cookieJar: new tough.CookieJar(new FileCookieStore(`./config/${username}-cookies.json`)),
      responseType: 'json',
    });
  }

  public static deleteCookies(username?: string): void {
    if (username) {
      fs.unlinkSync(`./config/${username}-cookies.json`);
    } else {
      fs.unlinkSync(`./config/cookies.json`);
    }
  }
}
