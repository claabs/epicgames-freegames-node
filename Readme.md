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
  * Save to file in case of shutdown
* Schedule check/purchase via cron string
* Authentication refresh to reduce login count
* *TODO:* Global store support (not just `en-US`)

### Potential future features

* Support for multiple accounts

## Setup

**This project is still in development. Recommended for experts only.**

### Google Speech-to-text

Epic uses FunCaptcha to stop bots, however the FunCaptcha audio game is fairly easy to crack using Google Speech-to-text. Google gives you 60 minutes of free transcription, and charges a small fee after that.

1. Create a new project for this bot. [GCP Console](https://console.cloud.google.com/)
1. [Add a billing account](https://console.cloud.google.com/billing) for the project. This is required even for the free 60 minutes of transcription. To limit your spending, using a [Privacy Card](https://privacy.com/) is recommended.
1. [Create a service account](https://console.cloud.google.com/iam-admin/serviceaccounts) for the project.
    * Don't add any roles to the service account
    * Don't add any users to the service account
1. After creating the service account, click the "Actions" button in the list and create a JSON key.
1. Add this JSON key file to the config folder for the project (`./config/account-name-abcdef12345.json`).
1. [Enable data logging](https://console.cloud.google.com/apis/api/speech.googleapis.com/data_logging) to be charged a lower fee in case you go over 60 minutes of transcription.

### Environment Variables

| Variable        | Example                         | Description                                                                           |
|-----------------|---------------------------------|---------------------------------------------------------------------------------------|
| EMAIL           | `example@gmail.com`             | Epic Games login email                                                                |
| PASSWORD        | `abc123`                        | Epic Games login password                                                             |
| GCP_CONFIG_NAME | `account-name-abcdef12345.json` | GCP credentials JSON filename located in ./config/                                    |
| RUN_ON_STARTUP  | `true`                          | (Optional) If true, the process will run on startup in addition to the scheduled time |
| CRON_SCHEDULE   | `0 12 * * *`                    | (Optional) Cron string of when to run the process                                     |
| LOG_LEVEL       | `info`                          | (Optional) Log level in lower case. Can be [silent, error, warn, info, debug]         |

### Docker Run

`docker run -d -e TZ=America/Chicago -e EMAIL=example@gmail.com -e PASSWORD=abc123 -e GCP_CONFIG_NAME=account-name-abcdef12345.json -e RUN_ON_STARTUP=true -v /mnt/user/appdata/epicgames-freegames/:/usr/app/config:rw charlocharlie/epicgames-freegames:latest`

### Future

Eventually, the project will be deployed in Docker and be configurable by either environment variables, configuration file, or both. Not all accounts require Captcha on login, so Google Speech-to-text will be optional unless necessary.

## Development

### Recommended Dev Environment Variables

Place these variables in a `.env` file in the project root.

| Variable      | Example  | Description                                                                                                      |
|---------------|----------|------------------------------------------------------------------------------------------------------------------|
| TEST_USER     | `abc123` | The default user to use when not provided in command options                                                     |
| TEST_PASSWORD | `xyz789` | The default password to use when not provided in command options                                                 |
| ENV           | `local`  | When set to 'local', the create account function will ask you to complete a captcha manually when the bot cannot |

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
