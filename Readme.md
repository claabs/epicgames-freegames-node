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
* Schedule check/purchase via cron string
* *TODO:* Authentication refresh to reduce login count
* *TODO:* Global store support (not just `en-US`)

### Potential future features

* Support for multiple accounts

## Setup

**This project is still in development. Recommended for experts only.**

* GCP Speech-to-text service account credentials JSON located in `./config/account-name-abcdef12345.json`.

### Environment Variables

| Variable        | Example                         | Description                                                                           |
|-----------------|---------------------------------|---------------------------------------------------------------------------------------|
| EMAIL           | `example@gmail.com`             | Epic Games login email                                                                |
| PASSWORD        | `abc123`                        | Epic Games login password                                                             |
| GCP_CONFIG_NAME | `account-name-abcdef12345.json` | GCP credentials JSON filename located in ./config/                                    |
| RUN_ON_STARTUP  | `true`                          | (Optional) If true, the process will run on startup in addition to the scheduled time |
| CRON_SCHEDULE   | `0 12 * * *`                    | (Optional) Cron string of when to run the process                                     |

### Future

Eventually, the project will be deployed in Docker and be configurable by either environment variables, configuration file, or both. Not all accounts require Captcha on login, so Google Speech-to-text will be optional unless necessary.

## Development

### Recommended Dev Environment Variables

Place these variables in a `.env` file in the project root.

| Variable      | Example   | Description                                                                                                      |
|---------------|-----------|------------------------------------------------------------------------------------------------------------------|
| TEST_USER     | `abc123`  | The default user to use when not provided in command options                                                     |
| TEST_PASSWORD | `xyz789`  | The default password to use when not provided in command options                                                 |
| ENV           | `local`   | When set to 'local', the create account function will ask you to complete a captcha manually when the bot cannot |

### Optional variables

These variables are not currently necessary due to the plus-sign email exploit.

| Variable                     | Example            | Description                              |
|------------------------------|--------------------|------------------------------------------|
| PERMANENT_EMAIL_HOST         | `imap.zoho.com`    | The incoming IMAP server name            |
| PERMANENT_EMAIL_PORT         | `993`              | The incoming IMAP port                   |
| PERMANENT_EMAIL_USER         | `example@zoho.com` | The IMAP username                        |
| PERMANENT_EMAIL_PASS         | `xyz789`           | The IMAP password                        |
| PERMANENT_EMAIL_ADDRESS      | `example`          | The email address portion before the '@' |
| PERMANENT_EMAIL_ADDRESS_HOST | `zohomail.com`     | The email address portion after the '@'  |
