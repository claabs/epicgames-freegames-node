# Epic Games Store Weekly Free Games

Automatically login and find available free games the Epic Games Store.
Sends you a prepopulated checkout link so you can complete the checkout after logging in.
Supports multiple accounts, login sessions, and scheduled runs.

## Setup

### JSON Configuration

The tool can be configured with a combination of JSON and environment variables. The config file supports [JSON5](https://json5.org/) syntax (comments, trailing commas, etc). For each property, the JSON config value takes priority over the respective environment variable value.

For details on each option, its defaults, and environment variable key, see the [config documentation site](https://json-schema.app/view/%2523?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json).

The config file is stored in the mounted `/usr/app/config` volume and can be named `config.json` or `config.json5`.

#### `config.json` or `config.json5`

```jsonc
{
  "cronSchedule": "0 0,6,12,18 * * *",
  "webPortalConfig": {
    "baseUrl": "https://epic.example.com",
  },
  "accounts": [
    {
      "email": "example@gmail.com",
    },
  ],
  "notifiers": [
    // You may configure as many of any notifier as needed
    // Here are some examples of each type
    {
      "type": "email",
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
    },
    {
      "type": "discord",
      "webhookUrl": "https://discord.com/api/webhooks/123456789123456789/A-abcdefghijklmn-abcdefghijklmnopqrst12345678-abcdefghijklmnop123456",
    },
    {
      "type": "telegram",
      "token": "644739147:AAGMPo-Jz3mKRnHRTnrPEDi7jUF1vqNOD5k",
      "chatId": "-987654321",
    },
    {
      "type": "apprise",
      "apiUrl": "http://192.168.1.2:8000",
      "urls": "mailto://user:pass@gmail.com",
    },
    {
      "type": "pushover",
      "token": "a172fyyl9gw99p2xi16tq8hnib48p2",
      "userKey": "uvgidym7l5ggpwu2r8i1oy6diaapll",
    },
    {
      "type": "gotify",
      "apiUrl": "https://gotify.net",
      "token": "SnL-wAvmfo_QT",
    },
    {
      "type": "homeassistant",
      "instance": "https://homeassistant.example.com",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      "notifyservice": "mobile_app_smartphone_name",
    },
    {
      "type": "bark",
      "key": "xxxxxxxxxxxxxxxxxxxxxx",
    },
    {
        "type": "ntfy",
        "webhookUrl": "https://ntfy.example.com/mytopic",
        "priority": "urgent",
        "token": "tk_mytoken"
    },
    {
      "type":"webhook",
      "url":"https://webhook.site/my_uuid",
    },
  ],
}
```

### Web server

This project can occasionally ask you to login via [device code authentication](https://github.com/MixV2/EpicResearch/blob/master/docs/auth/grant_types/device_code.md). Epic Games's device code session expires after 10 minutes, so this project uses a web server and redirect to prevent from sending you a new link every 10 minutes. There are two options for running the web server:

#### Web server config

If you're familiar with hosting web servers and/or reverse proxies, follow this:

1. Expose port 3000 in your Docker run config (e.g. `-p 81:3000` maps the host machine's port 81 to the container's port 3000)
1. If you want to access the Captcha solving page from outside your network, setup any port forwarding/reverse proxy/DNS
1. Set the `webPortalConfig.baseUrl` in the config

#### Localtunnel setup

If you don't have the ability to port forward/reverse proxy on your network, you can still access the web server remotely by setting:

```jsonc
{
  "webPortalConfig": {
    "localtunnel": true,
  },
}
```

in your `config.json`.

### Notifications

Each notification method has unique setup instructions. See the documented [notifier configs](https://json-schema.app/view/%2523%252Fdefinitions%252FgenericNotifier?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json) for details,instructions, and examples.

### Testing notification and web server

Since user actions may not always be required, the notification methods and web server can be manually tested. Essentially, you just need to add:

```jsonc
  "testNotifiers": true,
```

to the root of your `config.json`. For more details check out the [config docs](https://json-schema.app/view/%2523?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json).
Note: to optimize for standby memory usage, the web server does not run when the process is not running. The web server will only be available during a scheduled run.

### Docker Configuration

This image is available from both [GitHub Container Registry](https://github.com/claabs/epicgames-freegames-node/pkgs/container/epicgames-freegames-node) and [Docker Hub](https://hub.docker.com/repository/docker/charlocharlie/epicgames-freegames):

* `ghcr.io/claabs/epicgames-freegames-node:latest`
* `charlocharlie/epicgames-freegames:latest`

If you're [experiencing issues with Chromium starting](https://github.com/claabs/epicgames-freegames-node/issues/164) (hangs on login/notification), you can try the Debian image:

* `ghcr.io/claabs/epicgames-freegames-node:debian`
* `charlocharlie/epicgames-freegames:debian`

If you are using full JSON configuration, the only remaining Docker configurables are the [port](#ports) and [volume](#volumes).

#### Environment Variables

Most configuration options can be set via environment variable. Look for the `env` tag in the [config docs](https://claabs.github.io/epicgames-freegames-node/classes/AppConfig.html) for each option's key.

If for whatever reason you want to change the default config directory or config file name, `CONFIG_DIR` and `CONFIG_FILE_NAME` are available as environment variables.

#### Ports

| Host port | Container port | Description                                                                   |
|-----------|----------------|-------------------------------------------------------------------------------|
| `3000`    | `3000`         | Port mapping on which the web server hosting the captcha solving page resides |

#### Volumes

| Host location   | Container location | Mode | Description                               |
|-----------------|--------------------|------|-------------------------------------------|
| `/my/host/dir/` | `/usr/app/config`  | `rw` | Location of the config and cookie file(s) |

#### Memory Limit

It's recommended to add `-m 2g` as a `docker run` parameter to set a max memory usage of 2GB. The Chromium processes can sometimes run away, and without a limit your system can eventually lock up.

### Docker Run

#### With JSON Config

`$ docker run -d -v /my/host/dir/:/usr/app/config:rw -p 3000:3000 -m 2g ghcr.io/claabs/epicgames-freegames-node:latest`

#### Without JSON Config

Without JSON config, you can only configure one account.

`$ docker run -d -e TZ=America/Chicago -e EMAIL=example@gmail.com -e RUN_ON_STARTUP=true -e BASE_URL=https://example.com -e SMTP_HOST=smtp.gmail.com -e SMTP_PORT=587 -e EMAIL_SENDER_ADDRESS=hello@gmail.com -e EMAIL_SENDER_NAME="Epic Games Captchas" -e EMAIL_RECIPIENT_ADDRESS=hello@gmail.com -e SMTP_SECURE=true -e SMTP_USERNAME=hello@gmail.com -e SMTP_PASSWORD=abc123 -v /my/host/dir/:/usr/app/config:rw -p 3000:3000 -m 2g ghcr.io/claabs/epicgames-freegames-node:latest`

## Running without Docker

If for some reason you don't want to use Docker to run this tool you can run it from source by cloning this repo and installing Node.js.

1. Get this repo from Github
    * Clone using git (recommended): `git clone https://github.com/claabs/epicgames-freegames-node.git`
    * Or download and unpack ZIP archive: [epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node/archive/master.zip)
1. Create `config` folder in the cloned/unpacked directory
1. Create [JSON configuration](#json-configuration)
1. [Install Node.js 26](https://nodejs.org/) or higher
1. Install Node.js dependencies
    * Start terminal and navigate to cloned/unpacked directory
    * Run `npm i`
    * Run `npx playwright install chrome --with-deps`
1. Start application: `npm run start`
1. To update when using Git:
    * `git pull`
    * `npm i`
    * `npx playwright install chrome --with-deps`

## Proxy configuration

Network proxies are configured via the `*_PROXY` and `NO_PROXY` environment variables. Details on the environment variables available from [proxy-from-env](https://github.com/Rob--W/proxy-from-env#environment-variables), and the kinds of proxies avaiable from [proxy-agent](https://github.com/TooTallNate/proxy-agents/tree/main/packages/proxy-agent#maps-proxy-protocols-to-httpagent-implementations).

Set `EPICGAMES_FREEGAMES_NODE_USE_PROXY_CHROME=true` to make Chrome use the proxy server specified by `HTTPS_PROXY`. If `HTTPS_PROXY` is unset, Chrome uses `ALL_PROXY` instead. This setting affects Chrome only; Node.js requests keep their existing proxy behavior.

The application forwards the selected proxy value unchanged to Chrome with `--proxy-server`. It does not parse or normalize the value, apply `NO_PROXY`, or configure proxy authentication. Use a proxy server format Chrome accepts, and do not include credentials because Chrome exposes the argument in its process command line.

## Miscellaneous

### v5 to v6 Migration

TODO

### Thanks

Thanks to [epicgames-weekly-freegames](https://github.com/Ricardo-Osorio/epicgames-weekly-freegames) for the inspiration.

Thanks to [EpicResearch](https://github.com/MixV2/EpicResearch) for the documentation that made device code auth possible.
