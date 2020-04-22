import got from 'got';
import * as tough from 'tough-cookie';
import CookieStore from 'tough-cookie-file-store';

const cookieJar = new tough.CookieJar(new CookieStore('./config/cookies.json'));

const patchedRequest = got.extend({
  cookieJar,
  responseType: 'json',
});

export default patchedRequest;
