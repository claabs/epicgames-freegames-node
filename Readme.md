# Epic Games Store Weekly Free Games

## Purpose

Inspired by [epicgames-weekly-freegames](https://github.com/Ricardo-Osorio/epicgames-weekly-freegames), this project takes a different approach to redeeming free games. Automating game redemption using Selenium had some unavoidable downsides:

1. Fails on any UI updates to the store
1. Unable to resolve any Captcha requests

I decided to take a different approach by only using the APIs that the Epic Games Store site uses itself. This resolves the above issues by:

1. Using APIs that are more stable than web design
1. Manually injecting a FunCaptcha session token into the login flow

## Scope

* Login
  * CSRF/XSRF
  * Captcha
    * Automation via Google Cloud speech-to-text
  * *TODO:* 2FA handing via TOTP token
  * Session ID
* Game catalog discovery
  * Get list of available free games
  * Filter out games that are already owned
* Purchase available free games
  * Order preview
  * Order confirmation
* Cookie management
  * *TODO:* Save to file in case of shutdown
* *TODO:* Schedule check/purchase via cron string
* *TODO:* Authentication refresh to reduce login count
* *TODO:* Global store support (not just `en-US`)

### Potential future features

* Support for multiple accounts

## Setup

**This project is still in development. Recommended for experts only.**

* GCP Speech-to-text service account credentials JSON located in `./config/account-name-abcdef12345.json`.
* `EMAIL` and `PASSWORD` environment variables for the desired account.

### Future

Eventually, the project will be deployed in Docker and be configurable by either environment variables, configuration file, or both. Not all accounts require Captcha on login, so Google Speech-to-text will be optional unless necessary.
