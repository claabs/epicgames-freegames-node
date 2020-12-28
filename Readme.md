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
  * Captcha
    * Emails you when a link to solve a Captcha when required
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
  * Import cookies from browser
* Schedule check/purchase via cron string
* Authentication refresh to reduce login count
* Support for multiple accounts
* *TODO:* Proper global store support (Works fine for now)
* *TODO:* Redeem all free games, not just the weekly promotion

## Setup

### Captcha Emails

Recent events have removed the ability to easily automate Captcha solving with Google Speech-to-text. This is a workaround that makes **you** solve a captcha by emailing you a link where you can solve it.
To use this requires:

* The ability to expose ports on your machine/local network/internet
  * Where you expose the port limits where you can solve captchas from (the machine running the container/your home network/anywhere, respectively)
* Access to an SMTP server for email (Gmail works)

#### Email Setup

1. Expose port 3000 in your Docker run config (e.g. `-p 81:3000` maps the machine's port 81 to the container's port 3000)
1. If you want to access the Captcha solving page from outside your network, setup any port forwarding/reverse proxy/DNS
1. Set the `baseUrl` in the config
1. Set the SMTP settings in the email config
    * [Example Gmail settings](https://www.siteground.com/kb/google_free_smtp_server)
    * If you have 2FA setup for your Google account, you'll need to create an [app password](https://support.google.com/mail/answer/185833)

If you want to test the email and webserver, delete an account's `<email>-cookies.json` from your config directory, as this usually forces a fresh login with a captcha. Then just restart the container.

### JSON Configuration

The tool can be configured with a combination of JSON and environment variables. The config file supports [JSON5](https://json5.org/) syntax (comments, trailing commas, etc). For each property, the JSON config value takes priority over the respective environment variable value. For details on each property, see the [table below](#environment-variables).

The config file is store in the mounted `./config` directory.

#### `config.json` or `config.json5`

```json5
{
    "accounts": [
        // Multiple accounts can be configured here
        {
            "email": "example@gmail.com",
            "password": "abc123",
            "totp": "EMNCF83ULU39CYFOPAQW8VHZBC7S7CTWKDXM19C2S2JYI69R39NE"
        },
        {
            "email": "example2@gmail.com",
            "password": "abc123",
        },
    ],
    "onlyWeekly": false,
    "runOnStartup": true,
    "intervalTime": 60,
    "cronSchedule": "0 12 * * *",
    "runOnce": false,
    "logLevel": "info",
    "baseUrl": "https://example.com",
    "email": {
        "smtpHost": "smtp.gmail.com",
        "smtpPort": 587,
        "emailSenderAddress": "hello@gmail.com",
        "emailSenderName": "Epic Games Captchas",
        "emailRecipientAddress": "hello@gmail.com",
        "secure": false,
        "auth": {
            "user": "hello@gmail.com",
            "pass": "abc123",
        },
    }
}
```

### Docker Congifuration

If you are using full JSON configuration, the only remaining Docker configurables are `TZ` and the [volume](#volumes).

#### Environment Variables

| Variable                | Example                    | Default                 | Description                                                                                                                                                              |
|-------------------------|----------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| EMAIL                   | `example@gmail.com`        |                         | Epic Games login email. For multiple accounts, use [JSON Configuration](#json-configuration)                                                                             |
| PASSWORD                | `abc123`                   |                         | Epic Games login password                                                                                                                                                |
| BASE_URL                | `https://epic.example.com` | `http://localhost:3000` | The URL you will access to solve Captchas when required. Extra path names are supported                                                                                  |
| SMTP_HOST               | `smtp.gmail.com`           |                         | The outgoing SMTP host name                                                                                                                                              |
| SMTP_PORT               | `587`                      |                         | The outgoing SMTP port (SSL or TLS, see `secure`)                                                                                                                        |
| EMAIL_SENDER_ADDRESS    | `hello@gmail.com`          |                         | The sender of the email you will recieve (can be your email address)                                                                                                     |
| EMAIL_SENDER_NAME       | `Epic Games Captchas`      |                         | The name of the email sender                                                                                                                                             |
| EMAIL_RECIPIENT_ADDRESS | `hello@gmail.com`          |                         | The recipient of the email (can be your email address)                                                                                                                   |
| SMTP_SECURE             | `true`                     |                         | `true` for SSL (port 465), `false` for TLS or unsecure                                                                                                                   |
| SMTP_USERNAME           | `hello@gmail.com`          |                         | The SMTP username (if necessary)                                                                                                                                         |
| SMTP_PASSWORD           | `abc123`                   |                         | The SMTP password (if necessary)                                                                                                                                         |
| TOTP                    | `EMNCF83ULU3...YI69R39NE`  |                         | (**Maybe required**) If 2FA is enabled, add your TOTP secret. [See details below.](#two-factor-login)                                                                    |
| ONLY_WEEKLY             | `true`                     | `false`                 | (Optional) By default, the script will redeem all free games in the Epic Games catalog. To only redeem the weekly promotions, set to `true`                              |
| SERVER_PORT             | `3333`                     | `3000`                  | (Optional) Where the Express server listens. Useful for inter-container networks in Docker Compose, otherwise just stick to `-p`                                         |
| RUN_ON_STARTUP          | `true`                     | `false`                 | (Optional) If true, the process will run on startup in addition to the scheduled time                                                                                    |
| INTERVAL_TIME           | `60`                       | `60`                    | (Optional) intervalTime controls the script execution interval of multiple accounts in seconds. (Only effective when multiple accounts are configured using config.json) |
| CRON_SCHEDULE           | `0 12 * * *`               | `0 12 * * *`            | (Optional) Cron string of when to run the process. If using `TZ=UTC`, a value of `5 16 * * *` will run 5 minutes after the new games are available                       |
| RUN_ONCE                | `true`                     | `false`                 | (Optional) If true, don't schedule runs. Use with RUN_ON_STARTUP to run once and shutdown.                                                                               |
| LOG_LEVEL               | `info`                     | `info`                  | (Optional) Log level in lower case. Can be [silent, error, warn, info, debug, trace]                                                                                     |
| TZ                      | `America/Chicago`          | `UTC`                   | (Optional) [TZ name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)                                                                                       |

#### Ports

| Host port | Container port | Description                                                                   |
|-----------|----------------|-------------------------------------------------------------------------------|
| `3001`    | `3000`         | Port mapping on which the web server hosting the Captcha solving page resides |

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

`$ docker run -d -e TZ=America/Chicago -v /my/host/dir/:/usr/app/config:rw -p 3000:3000 charlocharlie/epicgames-freegames:latest`

#### Without JSON Config

`$ docker run -d -e TZ=America/Chicago -e EMAIL=example@gmail.com -e PASSWORD=abc123 -e TOTP=ABC123 -e RUN_ON_STARTUP=true -e BASE_URL=https://example.com -e SMTP_HOST=smtp.gmail.com -e SMTP_PORT=587 -e SMTP_HOST=smtp.gmail.com -e EMAIL_SENDER_ADDRESS=hello@gmail.com -e EMAIL_SENDER_NAME="Epic Games Captchas" -e EMAIL_RECIPIENT_ADDRESS=hello@gmail.com -e SMTP_SECURE=true -e SMTP_USERNAME=hello@gmail.com -e SMTP_PASSWORD=abc123 -v /my/host/dir/:/usr/app/config:rw -p 3001:3000 charlocharlie/epicgames-freegames:latest`

### Cookie Import

If you're experiencing issues logging with with username and password, you can import cookies for a temporary session.

1. Setup the container per the below instructions
1. In your web browser, log in to the Epic Games Store with "Remember me" checked.
1. Install the [Cookie Editor](https://cookie-editor.cgagnier.ca/) or [EditThisCookie](http://www.editthiscookie.com/) browser extension.
1. While viewing the Epic Games Store page, copy your cookies to clipboard by clicking the "Export" button on the extension:
![Cookie Editor export button](https://github.com/claabs/epicgames-freegames-node/blob/master/img/cookie-editor.png?raw=true)
1. In your mounted `./config` folder, create `<email_address>-cookies.json` (e.g. `me@example.com-cookies.json`), and paste in your cookies.
1. Start the epicgames-freegames-node container and the cookies will automatically be converted to a new format.

**Notes:**

* Due to device ID issues, you will only stay logged in for 8 hours.
* If you log out of the browser session you copied the cookies from, the container will break.
* If you have the container scheduled regularly, it should automatically refresh the cookies and keep you logged in for some time.
* If you get an email prompting you to solve a captcha to log in, you should repeat the above process.
* Epic Games still uses Arkose for purchase captchas, so you still may recieve emails when games are redeemed.
* Your password is optional when using this, so you can fill it with some junk if you prefer. It just can't be `""`.

## Development

### Recommended Dev Environment Variables

Place these variables in a `.env` file in the project root.

| Variable      | Example              | Description                                                                                                      |
|---------------|----------------------|------------------------------------------------------------------------------------------------------------------|
| TEST_USER     | `abc123@example.com` | The default user to use when not provided in command options                                                     |
| TEST_PASSWORD | `xyz789`             | The default password to use when not provided in command options                                                 |
| TEST_TOTP     | `xyz789`             | The default password to use when not provided in command options                                                 |
| ENV           | `local`              | When set to 'local', the create account function will ask you to complete a captcha manually when the bot cannot |

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
