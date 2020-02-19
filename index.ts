/* eslint-disable no-console */
import * as cookieParser from 'set-cookie-parser';
import { config } from 'dotenv';
import axios from './axios';
import { CSRFSetCookies, LoginBody, GraphQLBody, FreegamesResponse } from './types';

config();

const CSRF_ENDPOINT = 'https://www.epicgames.com/id/api/csrf';
const LOGIN_ENDPOINT = 'https://www.epicgames.com/id/api/login';
const GRAPHQL_ENDPOINT = 'https://graphql.epicgames.com/graphql';

const EMAIL = process.env.EMAIL || 'missing@email.com';
const PASSWORD = process.env.PASSWORD || 'missing-password';

async function login(email: string, password: string, totp: string): Promise<void> {
  const csrfResp = await axios.get(CSRF_ENDPOINT);
  const cookies = (cookieParser(csrfResp.headers['set-cookie'], {
    map: true,
  }) as unknown) as CSRFSetCookies;
  const csrfToken = cookies['XSRF-TOKEN'].value;

  const loginBody: LoginBody = {
    password,
    rememberMe: false,
    captcha: '',
    email,
  };
  try {
    await axios.post(LOGIN_ENDPOINT, loginBody, {
      headers: {
        'x-xsrf-token': csrfToken,
      },
    });
    console.log('LOGGED IN!');
  } catch (e) {
    if (e.response.data.errorCode === 'errors.com.epicgames.accountportal.session_invalidated') {
      console.log('Session invalidated, retrying');
      await login(email, password, totp);
    } else {
      console.error('LOGIN FAILED');
      throw e;
    }
  }
}

async function getFreeGames(): Promise<FreegamesResponse> {
  const query = `query promotionsQuery($namespace: String!, $country: String!, $locale: String!) {
    Catalog {
      catalogOffers(namespace: $namespace, locale: $locale, params: {category: "freegames", country: $country, sortBy: "effectiveDate", sortDir: "asc"}) {
        elements {
          title
          description
          id
          namespace
          categories {
            path
          }
          linkedOfferNs
          linkedOfferId
          productSlug
          promotions {
            promotionalOffers {
              promotionalOffers {
                startDate
                endDate
              }
            }
          }
        }
      }
    }
  }`;
  const variables = { namespace: 'epic', country: 'US', locale: 'en-US' };
  const data: GraphQLBody = { query, variables };
  let resp;
  try {
    resp = await axios.post<FreegamesResponse>(GRAPHQL_ENDPOINT, data);
  } catch (e) {
    console.error(e.response.data);
    throw e;
  }
  return resp.data;
}

login(EMAIL, PASSWORD, '');
// getFreeGames();
