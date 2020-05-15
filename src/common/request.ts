import got from 'got';
import * as tough from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';

const cookieJar = new tough.CookieJar(new FileCookieStore('./config/cookies.json'));

const patchedRequest = got.extend({
  cookieJar,
  responseType: 'json',
});

export default patchedRequest;
