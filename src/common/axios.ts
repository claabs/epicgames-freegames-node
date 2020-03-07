import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';
import CookieStore from 'tough-cookie-file-store';

const patchedAxios = axios.create({
  xsrfHeaderName: 'x-xsrf-token',
  xsrfCookieName: 'XSRF-TOKEN',
  withCredentials: true,
});

axiosCookieJarSupport(patchedAxios);

// patchedAxios.defaults.jar = true;
patchedAxios.defaults.jar = new tough.CookieJar(new CookieStore('./config/cookies.json'));

export default patchedAxios;
