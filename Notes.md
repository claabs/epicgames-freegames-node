# Notes

## Login

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

To determine if you own a game, use the `entitledOfferItems` GraphQL query. This will return `entitledToAllItemsInOffer: boolean` and `entitledToAnyItemInOffer: boolean`. The two variables make up various states of purchasability.

|                                        | entitledToAllItemsInOffer = `true` | entitledToAllItemsInOffer = `false` |
|----------------------------------------|------------------------------------|-------------------------------------|
| **entitledToAnyItemInOffer = `true`**  | Already owned                      | Coming soon                         |
| **entitledToAnyItemInOffer = `false`** | *TBD*                              | Purchasable                         |

## Purchase

## Testing

Assuming there will always be at least one free game offer available, test account creation can be done with the following strategy:

### New Strategy

Epic does not filter out the plus-sign suffix that many email mailboxes use to reuse emails. Because of this, we can just create accounts using the same permanent email address.

### Old Strategy

1. Have a **permanent email** on a trusted domain (e.g. gmail.com) that is used to create the account.
    * Epic blocks registering accounts with temp email domains. However they don't block temp email domains on the "change email" process.
1. Create the account with a random first name, last name, username, and password.
    * Random 16 character alphanumeric username should work
1. Use email APIs to verify the account.
    * This may not be required for what we're testing.
1. Perform the tests using this account's credentials.

Whether the tests fail or complete, we need to tear down the account:

1. Using a temp mail service's API ([like this](https://rapidapi.com/Privatix/api/temp-mail)), create a **temp email**.
2. Begin Epic's email address change process to switch from the **permanent email** to the **temp email**.
3. Confirm the email change using the security code sent to the **permanent email**.
4. *(Optional):* Delete the account.
    * Not sure if deleting the account increases or reduces the attention we will recieve.

This process lets us create a fresh account for testing, repeatedly, using the same permanent email.
