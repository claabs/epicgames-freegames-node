import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';

const patchedAxios = axios.create({
  xsrfHeaderName: 'x-xsrf-token',
  xsrfCookieName: 'XSRF-TOKEN',
  withCredentials: true,
});

axiosCookieJarSupport(patchedAxios);

// patchedAxios.defaults.jar = true;
patchedAxios.defaults.jar = new tough.CookieJar();

export default patchedAxios;
