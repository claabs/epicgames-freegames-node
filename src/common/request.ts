import got from 'got';
import * as tough from 'tough-cookie';
import CookieStore from 'tough-cookie-file-store';

const patchedRequest = got.extend({
  cookieJar: new tough.CookieJar(new CookieStore('./config/cookies.json')),
  responseType: 'json',
});

export default patchedRequest;
