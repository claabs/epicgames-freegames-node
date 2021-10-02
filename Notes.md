# Notes

## Login

The login process is made up of four key components:

- CSRF
- Login
- Captcha
- MFA
- Redirect
- Set SID

To log in, we must perform a precise dance between handling errors, managing headers, and storing cookies. I won't document the entire process in detail, but a summary looks like this:

1. Call CSRF, remember the token
1. Call login with CSRF header
    1. If login errors with `session_invalidated`
        1. Go back to 1.
    1. If login errors with `captcha_invalid`
        1. Solve a captcha, remember the captcha token
        1. Go back to 1. with the captcha token
    1. If login errors with `two_factor_authentication.required`
        1. Call CSRF
        1. Call MFA with TOTP code and CSRF header
1. Call redirect with CSRF header, remember the SID
1. Call Set SID

### Login Refresh

Make a call to the redirect endpoint with a valid `EPIC_SESSION_AP` cookie to refresh your credential cookies.

`rememberMe: false` during login will give you 8 hour cookies. `rememberMe: true` will give you 30 day cookies.

`rememberMe: true` response sets the cookies:
| Name              | Max-Age |
|-------------------|---------|
| EPIC_SSO          | 28800   |
| EPIC_BEARER_TOKEN | 28800   |
| EPIC_SSO_RM       | 2592000 |
| EPIC_SESSION_AP   | 2592000 |

## Free Games Lookup

### Determining Ownership

To determine if you own a game, use the `entitledOfferItems` GraphQL query. This will return `entitledToAllItemsInOffer: boolean` and `entitledToAnyItemInOffer: boolean`. The two variables make up various states of purchasability.

|                                        | entitledToAllItemsInOffer = `true` | entitledToAllItemsInOffer = `false` |
|----------------------------------------|------------------------------------|-------------------------------------|
| **entitledToAnyItemInOffer = `true`**  | Already owned                      | Coming soon                         |
| **entitledToAnyItemInOffer = `false`** | *TBD*                              | Purchasable                         |

## Purchase

A general overview of the purchase process. See the code for specifics.

### Purchase Prerequesites

- Logged in
- offerId of game to be purchased
- namespaceId of game to be purchased

### Purchase Process

1. Call `/store/purchase` with the namespaceId and offerId as parameters. 
    1. Remember the purchase token located at `<input id="purchaseToken">` in the HTML document
1. *(Optional)* Call Safetech with the purchase token as a parameter
    1. Doesn't seem necessary as of now
1. Call order preview with the namespaceId and offerId in the body, and the purchase token in a header
    1. Remember the order preview response
1. Call confirm order with essentially the contents of order preview, and the purchase token in a header
