![Made by human; no agentic AI used](https://codeberg.org/sanin/no-ai-used-badges/raw/branch/master/assets/images/webp/no-agentic.webp)

# Epic Games Store Weekly Free Games

Automatically login and find available free games the Epic Games Store.
Sends you a prepopulated checkout link so you can complete the checkout after logging in.
Supports multiple accounts, login sessions, and scheduled runs.

## Setup

This image is available from both [GitHub Container Registry](https://github.com/claabs/epicgames-freegames-node/pkgs/container/epicgames-freegames-node) and [Docker Hub](https://hub.docker.com/r/charlocharlie/epicgames-freegames):

* `ghcr.io/claabs/epicgames-freegames-node:latest`
* `charlocharlie/epicgames-freegames:latest`


### Docker Compose

```yaml
services:
  epicgames-freegames-node:
    image: ghcr.io/claabs/epicgames-freegames-node
    ports:
      - 3000:3000
    volumes:
      - /your/host/dir/config:/usr/app/config
    deploy:
      resources:
        limits:
          memory: 2G
    init: true
    ipc: host
    restart: unless-stopped

```

### Docker Run

```sh
docker run -d -v /my/host/dir/:/usr/app/config -p 3000:3000 -m 2g -init --ipc=host ghcr.io/claabs/epicgames-freegames-node:latest
```

#### Ports

| Host port | Container port | Description                                                         |
|-----------|----------------|---------------------------------------------------------------------|
| `3000`    | `3000`         | Port mapping on which the web server hosting login redirect resides |

#### Volumes

| Host location   | Container location | Mode | Description                                 |
|-----------------|--------------------|------|---------------------------------------------|
| `/my/host/dir/` | `/usr/app/config`  | `rw` | Location of the config and browser profiles |

#### Memory Limit

The Chromium processes can sometimes run away, so a 2 GB memory limit prevents your system from locking up.


### JSON Configuration

The tool can be configured with a combination of JSON and environment variables. The config file supports [JSON5](https://json5.org/) syntax (comments, trailing commas, etc). For each property, the JSON config value takes priority over the respective environment variable value. For details on each option, its defaults see the [config documentation site](https://json-schema.app/view/%2523?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json).

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

#### Environment Variables

Most configuration options can be set via environment variable. Look for the `Env:` tag in the [config docs](https://json-schema.app/view/%2523?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json) for each option's key.

If for whatever reason you want to change the default config directory or config file name, `CONFIG_DIR` and `CONFIG_FILE_NAME` are available as environment variables.

### Web server

This project can occasionally ask you to login via [device code authentication](https://github.com/MixV2/EpicResearch/blob/master/docs/auth/grant_types/device_code.md). Epic Games's device code session expires after 10 minutes, so this project uses a web server and redirect to prevent from sending you a new link every 10 minutes. There are two options for running the web server:

#### Web server config

1. Expose port 3000 in your Docker run config (e.g. `-p 81:3000` maps the host machine's port 81 to the container's port 3000)
1. If you want to access the redirect from outside your network, setup any port forwarding/reverse proxy/DNS
1. Set the `webPortalConfig.baseUrl` in the config

#### Localtunnel setup

If you don't have the ability to port forward/reverse proxy on your network, you can still access the web server remotely using [localtunnel](https://theboroer.github.io/localtunnel-www/) by setting:

```jsonc
{
  "webPortalConfig": {
    "localtunnel": true,
  },
}
```

### Notifications

Each notification method has unique setup instructions. See the documented [notifier configs](https://json-schema.app/view/%2523%252Fdefinitions%252FgenericNotifier?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json) for details,instructions, and examples.

### Testing notification and web server

Since user actions may not always be required, the notification methods and web server can be manually tested. Just temporarily add:

```jsonc
  "testNotifiers": true,
```

to the root of your `config.json`. For more details check out the [config docs](https://json-schema.app/view/%2523?url=https%3A%2F%2Fraw.githubusercontent.com%2Fclaabs%2Fepicgames-freegames-node%2Frefs%2Fheads%2Fmaster%2Fdocs%2Fapp-config.schema.json).
Note: to optimize for standby memory usage, the web server does not run when the process is not running. The web server will only be available during a scheduled run.


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

- `runOnStartup` defaults to true instead of false to aid with first time setup
- `deviceAuthPollRateSeconds` minimum increased from 1 to 10 (it got overridden to that anyway)
- `armv7` images no longer published, sorry.
- `:bullseye-slim` tag no longer published. Just use `:latest`.
- `:debian` tag is deprectated. Just use `:latest` .
- These are recommended by [Playwright](https://playwright.dev/docs/docker#recommended-docker-configuration):
  - Add `--ipc=host` / `ipc: host` to your container
  - Add `--init / init: true` to your container
- `browserLaunchTimeout` default increased from 15s to 30s to help with low power devices

### Thanks

Thanks to [epicgames-weekly-freegames](https://github.com/Ricardo-Osorio/epicgames-weekly-freegames) for the inspiration.

Thanks to [EpicResearch](https://github.com/MixV2/EpicResearch) for the documentation that made device code auth possible.
