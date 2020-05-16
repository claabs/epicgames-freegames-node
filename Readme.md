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
  * 2FA handing via TOTP token
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

### JSON Configuration

The tool can be configured with a combination of JSON and environment variables. The config file supports [JSON5](https://json5.org/) syntax (comments, trailing commas, etc). For each property, the JSON config value takes priority over the respective environment variable value. For details on each property, see the [table below](#environment-variables).

The config file is store in the mounted `./config` directory.

#### `config.json` or `config.json5`

```json5
{
    "accounts": [
        {
            "email": "example@gmail.com",
            "password": "abc123",
            "totp": "EMNCF83ULU39CYFOPAQW8VHZBC7S7CTWKDXM19C2S2JYI69R39NE"
        },
    ],
    "gcpConfigName": "account-name-abcdef12345.json",
    "runOnStartup": true,
    "cronSchedule": "0 12 * * *",
    "logLevel": "info",
}
```

### Docker Congifuration

If you are using full JSON configuration, the only remaining Docker configurables are `TZ` and the [volume](#volumes).

#### Environment Variables

| Variable        | Example                         | Default      | Description                                                                                                                                        |
|-----------------|---------------------------------|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| EMAIL           | `example@gmail.com`             |              | Epic Games login email                                                                                                                             |
| PASSWORD        | `abc123`                        |              | Epic Games login password                                                                                                                          |
| TOTP            | `EMNCF83ULU39CYFO...YI69R39NE`  |              | (**Maybe required**) If 2FA is enabled, add your TOTP secret. [See details below.](#two-factor-login)                                              |
| GCP_CONFIG_NAME | `account-name-abcdef12345.json` |              | (Optional) GCP credentials JSON filename located in `./config/`. Required if login requires captcha                                                |
| RUN_ON_STARTUP  | `true`                          | `false`      | (Optional) If true, the process will run on startup in addition to the scheduled time                                                              |
| CRON_SCHEDULE   | `0 12 * * *`                    | `0 12 * * *` | (Optional) Cron string of when to run the process. If using `TZ=UTC`, a value of `5 16 * * *` will run 5 minutes after the new games are available |
| LOG_LEVEL       | `info`                          | `info`       | (Optional) Log level in lower case. Can be [silent, error, warn, info, debug]                                                                      |
| TZ              | `America/Chicago`               | `UTC`        | (Optional) [TZ name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)                                                                 |

#### Volumes

| Host location   | Container location | Mode | Description                            |
|-----------------|--------------------|------|----------------------------------------|
| `/my/host/dir/` | `/usr/app/config`  | `rw` | Location of the config and cookie file |

#### Two-factor login

**Epic has begun [enforcing two-factor](https://www.epicgames.com/store/en-US/news/two-factor-authentication-required-when-claiming-free-games) when claiming free games. It is likely necessary when using this tool.**

If you have two-factor authentication (2FA) enabled on your account, you need to add your TOTP secret as an environment variable. To get your TOTP secret, you may need to redo your 2FA setup:

1. Go [here](https://www.epicgames.com/account/password) to enable 2FA.
1. Click "enable authenticator app."
1. In the section labeled "manual entry key," copy the key.
1. Use your authenticator app to add scan the QR code.
1. Activate 2FA by completing the form and clicking activate.
1. Once 2FA is enabled, use the key you copied as the value for the TOTP parameter.

### Docker Run

#### With JSON Config

`$ docker run -d -e TZ=America/Chicago -v /my/host/dir/:/usr/app/config:rw charlocharlie/epicgames-freegames:latest`

#### Without JSON Config

`$ docker run -d -e TZ=America/Chicago -e EMAIL=example@gmail.com -e PASSWORD=abc123 -e TOTP=ABC123 -e GCP_CONFIG_NAME=account-name-abcdef12345.json -e RUN_ON_STARTUP=true -v /my/host/dir/:/usr/app/config:rw charlocharlie/epicgames-freegames:latest`

## Development

### Recommended Dev Environment Variables

Place these variables in a `.env` file in the project root.

| Variable      | Example  | Description                                                                                                      |
|---------------|----------|------------------------------------------------------------------------------------------------------------------|
| TEST_USER     | `abc123` | The default user to use when not provided in command options                                                     |
| TEST_PASSWORD | `xyz789` | The default password to use when not provided in command options                                                 |
| TEST_TOTP     | `xyz789` | The default password to use when not provided in command options                                                 |
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
