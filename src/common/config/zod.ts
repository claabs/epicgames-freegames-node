import { join } from 'node:path';

import z from 'zod';

export const CONFIG_DIR = process.env.CONFIG_DIR ?? 'config';

export const localConfigSchema = z
  .object({
    type: z.literal('local'),
  })
  .meta({
    description:
      'For local development only. This just opens the notified URL in your default browser.',
  });

export const appriseConfigSchema = z
  .object({
    type: z.literal('apprise'),
    apiUrl: z.url().meta({
      description: 'The base URL of your Apprise instance',
      example: 'http://localhost:8000',
      env: 'APPRISE_API',
    }),
    urls: z.string().optional().meta({
      description:
        "One or more URLs identifying where the notification should be sent to. If this field isn't specified then it automatically assumes the settings.APPRISE_STATELESS_URLS in your Apprise instance. More details: https://github.com/caronc/apprise-api#stateless-solution",
      example: 'mailto://user:pass@gmail.com',
      env: 'APPRISE_URLS',
    }),
  })
  .meta({
    description:
      'Sends a notification to many services via [Apprise API](https://github.com/caronc/apprise-api). Supports 70+ different [notification services](https://github.com/caronc/apprise/wiki#notification-services).',
  });

export const discordConfigSchema = z
  .object({
    type: z.literal('discord'),
    webhookUrl: z.url().meta({
      description:
        'Discord channel webhook URL. Guide: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
      example:
        'https://discord.com/api/webhooks/123456789123456789/A-abcdefghijklmn-abcdefghijklmnopqrst12345678-abcdefghijklmnop123456',
      env: 'DISCORD_WEBHOOK',
    }),
    mentionedUsers: z.array(z.string()).optional().meta({
      description:
        'A list of Discord user IDs to ping when posting the message. How to get a user ID: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-',
      example: '["914360712086843432", "914360712086843433"]',
      env: 'DISCORD_MENTIONED_USERS (comma separated)',
    }),
    mentionedRoles: z.array(z.string()).optional().meta({
      description:
        'A list of Discord role IDs to ping when posting the message. To get a role ID: enable developer mode > right click a role > "Copy ID"',
      example: '["734548250895319070", "734548250895319071"]',
      env: 'DISCORD_MENTIONED_ROLES (comma separated)',
    }),
    showUrl: z.boolean().default(false).meta({
      description:
        'If true, the Discord message will contain the full URL in the message text. Helpful if you need to copy-paste the URL.',
      example: true,
      default: false,
      env: 'DISCORD_SHOW_URL',
    }),
  })
  .meta({ description: 'Sends a message to a server text channel using a webhook' });

export const pushoverConfigSchema = z
  .object({
    type: z.literal('pushover'),
    token: z.string().meta({
      description: 'Guide: https://pushover.net/apps/build',
      example: 'a172fyyl9gw99p2xi16tq8hnib48p2',
      env: 'PUSHOVER_TOKEN',
    }),
    userKey: z.string().meta({
      example: 'uvgidym7l5ggpwu2r8i1oy6diaapll',
      env: 'PUSHOVER_USER_ID',
    }),
  })
  .meta({ description: 'Sends a pushover message' });

export const telegramConfigSchema = z
  .object({
    type: z.literal('telegram'),
    token: z
      .string()
      .regex(/\d+:[a-zA-Z0-9_-]{35}/)
      .meta({
        description:
          'Telegram bot token obtained here: https://core.telegram.org/bots#3-how-do-i-create-a-bot',
        example: '644739147:AAGMPo-Jz3mKRnHRTnrPEDi7jUF1vqNOD5k',
        env: 'TELEGRAM_TOKEN',
      }),
    chatId: z.string().nonempty().meta({
      description: 'Unique identifier for the target chat or username of the target channel',
      example: '-987654321',
      env: 'TELEGRAM_CHAT_ID',
    }),
    topic: z.number().int().optional().meta({
      description: 'Identifier for the topic/thread to send the messages',
      example: 5,
      env: 'TELEGRAM_TOPIC',
    }),
    apiUrl: z.url().default('https://api.telegram.org').meta({
      description: 'Custom Telegram server URL',
      default: 'https://api.telegram.org',
      env: 'TELEGRAM_API_URL',
    }),
  })
  .meta({ description: 'Sends a message to a group chat using a bot you must set up yourself' });

export const gotifyConfigSchema = z
  .object({
    type: z.literal('gotify'),
    apiUrl: z.url().meta({
      description: 'The Gotify server host URL',
      example: 'http://gotify.net',
      env: 'GOTIFY_API_URL',
    }),
    token: z.string().nonempty().meta({
      description: 'On the Gotify web UI, Apps > Create Application > reveal the token',
      example: 'SnL-wAvmfo_QT',
      env: 'GOTIFY_TOKEN',
    }),
    priority: z.number().int().min(0).max(10).default(5).meta({
      description: 'The priority level sent with the message.',
      example: 7,
      default: 5,
      env: 'GOTIFY_PRIORITY',
    }),
  })
  .meta({ description: 'Sends a message to a self-hosted [Gotify](https://gotify.net/) server' });

export const slackConfigSchema = z
  .object({
    type: z.literal('slack'),
    webhookUrl: z.url().meta({
      description: 'slack channel webhook URL. Guide: https://api.slack.com/messaging/webhooks',
      example:
        'https://hooks.slack.com/services/T22CE80ABCD/CE3AWABCDEFG/F8jdewBb4fmDDx6fV0abcdefg',
      env: 'SLACK_WEBHOOK',
    }),
  })
  .meta({ description: 'Sends a [slack](https://slack.com/) message using webhook' });

export const ntfyConfigSchema = z
  .object({
    type: z.literal('ntfy'),
    webhookUrl: z.url().meta({
      description: 'ntfy channel webhook URL. Guide: https://docs.ntfy.sh/publish/',
      example: 'https://ntfy.sh/mytopic',
      env: 'NTFY_WEBHOOK',
    }),
    priority: z.string().meta({
      description: 'ntfy channel priority. Guide: https://docs.ntfy.sh/publish/',
      example: 'urgent',
      env: 'NTFY_PRIORITY',
    }),
    token: z.string().meta({
      description: 'ntfy channel token. Guide: https://docs.ntfy.sh/config/#access-tokens',
      example: 'tk_yourtoken',
      env: 'NTFY_TOKEN',
    }),
  })
  .meta({ description: 'Sends a ntfy message using webhook' });

export const emailAuthConfigSchema = z.object({
  user: z.string().meta({
    description: 'The SMTP username (if necessary)',
    example: 'hello@gmail.com',
    env: 'SMTP_USERNAME',
  }),
  pass: z.string().meta({
    description: 'The SMTP password (if necessary)',
    example: 'abc123',
    env: 'SMTP_PASSWORD',
  }),
});

export const emailConfigSchema = z
  .object({
    type: z.literal('email'),
    smtpHost: z.string().meta({
      description: 'The outgoing SMTP host name',
      example: 'smtp.gmail.com',
      env: 'SMTP_HOST',
    }),
    smtpPort: z.number().int().min(0).max(65535).meta({
      description: 'The outgoing SMTP port (SSL or TLS, see secure)',
      example: 587,
      env: 'SMTP_PORT',
    }),
    emailSenderAddress: z.email().meta({
      description: 'The sender of the email you will receive',
      example: 'hello@gmail.com',
      env: 'EMAIL_SENDER_ADDRESS',
    }),
    emailSenderName: z.string().meta({
      description: 'The name of the email sender',
      example: 'Epic Games Free Games',
      env: 'EMAIL_SENDER_NAME',
    }),
    emailRecipientAddress: z.email().meta({
      description: 'The recipient of the email',
      example: 'hello@gmail.com',
      env: 'EMAIL_RECIPIENT_ADDRESS',
    }),
    secure: z.boolean().default(false).meta({
      description: 'true for SSL (port 465), false for TLS or unsecure',
      example: true,
      default: false,
      env: 'SMTP_SECURE',
    }),
    auth: emailAuthConfigSchema
      .meta({
        description: 'Auth settings for SMTP',
      })
      .optional(),
  })
  .meta({
    description: `Configuration for sending notifications via email. [Example Gmail settings](https://www.siteground.com/kb/google_free_smtp_server). If you have 2FA setup for your Google account, you'll need to create an [app password](https://support.google.com/mail/answer/185833)`,
  });

export const homeAssistantConfigSchema = z
  .object({
    type: z.literal('homeassistant'),
    instance: z.string().meta({
      example: 'https://homeassistant.example.com',
      env: 'HOMEASSISTANT_INSTANCE',
    }),
    token: z.string().meta({
      env: 'HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN',
    }),
    notifyservice: z.string().meta({
      example: 'mobile_app_smartphone_name',
      env: 'HOMEASSISTANT_NOTIFYSERVICE',
    }),
    customData: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .meta({
        description: "A key-value pair object to additionally pass into the service's data object",
        example: '{ "parse_mode": "html" }',
        env: 'HOMEASSISTANT_CUSTOM_DATA (stringified JSON)',
      }),
  })
  .meta({ description: 'Sends a homeassistant notification' });

export const barkConfigSchema = z
  .object({
    type: z.literal('bark'),
    key: z.string().meta({
      description: 'Bark key',
      env: 'BARK_KEY',
    }),
    title: z.string().default('epicgames-freegames-node').meta({
      description: 'Bark title',
      default: 'epicgames-freegames-node',
      env: 'BARK_TITLE',
    }),
    group: z.string().default('epicgames-freegames-node').meta({
      description: 'Bark group',
      default: 'epicgames-freegames-node',
      env: 'BARK_GROUP',
    }),
    apiUrl: z.url().default('https://api.day.app').meta({
      description: 'Custom Bark server URL',
      default: 'https://api.day.app',
      env: 'BARK_API_URL',
    }),
  })
  .meta({ description: 'Send a notification to the Bark iOS app. https://github.com/Finb/Bark' });

export const webhookConfigSchema = z
  .object({
    type: z.literal('webhook'),
    url: z.url().meta({
      description: 'Webhook URL',
      env: 'WEBHOOK_URL',
    }),
    headers: z.record(z.string(), z.string()).optional().meta({
      description: 'A key-value pair object to pass into the POST request headers',
      example: '{ Authorization: "Bearer ABCD" }',
      env: 'WEBHOOK_HEADERS (stringified JSON)',
    }),
  })
  .meta({
    description:
      'ends a POST request with the notification contents in the body to a [webhook](https://en.wikipedia.org/wiki/Webhook) URL',
  });

export const notifierConfigSchema = z.discriminatedUnion('type', [
  emailConfigSchema,
  discordConfigSchema,
  localConfigSchema,
  telegramConfigSchema,
  appriseConfigSchema,
  pushoverConfigSchema,
  gotifyConfigSchema,
  slackConfigSchema,
  homeAssistantConfigSchema,
  barkConfigSchema,
  ntfyConfigSchema,
  webhookConfigSchema,
]);

export const webPortalConfigSchema = z.object({
  baseUrl: z.url().default('http://localhost:3000').meta({
    description: 'The URL base that will be returned when a device token login is required',
    example: 'https://epic.example.com',
    default: 'http://localhost:3000',
    env: 'BASE_URL',
  }),

  listenOpts: z
    .object({
      port: z.number().int().optional(),
    })
    .catchall(z.unknown())
    .optional()
    .meta({
      description:
        'Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback',
      default: '{ port: 3000 }',
      env: 'SERVER_PORT (for `{port: SERVER_PORT}` only)',
    }),

  serverOpts: z.record(z.string(), z.unknown()).optional().meta({
    description:
      'Node HTTPS.createServer options: https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener',
  }),

  localtunnel: z
    .boolean()
    .prefault(process.env.LOCAL_TUNNEL?.toLowerCase() === 'true')
    .meta({
      description:
        'If true, provide a remotely accessible web address via [localtunnel](https://localtunnel.me) without the need to port forward or reverse proxy',
      example: true,
      default: false,
      env: 'LOCAL_TUNNEL',
    }),
});

export const accountConfigSchema = z.object({
  email: z
    .preprocess((v) => v ?? process.env.EMAIL, z.email('Must be a valid email address'))
    .meta({
      description: 'Epic Games login email',
      example: 'example@gmail.com',
      env: 'EMAIL',
    }),

  notifiers: z.array(notifierConfigSchema).optional().meta({
    description:
      'Notification options for just this account. This overrides any global notification configs. You may configure multiple notifiers, and they will all be triggered simultaneously.',
  }),
});

export const appConfigSchema = z.preprocess(
  (input) => {
    // If undefined, default to an empty object so defaults and env vars apply
    if (input === undefined) return {};

    // If it's not a plain object (e.g., a string, number, or array), return it as-is so Zod throws a proper type error instead of swallowing it.
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return input;
    }

    const config = input as Record<string, unknown>;

    config.notifiers = Array.isArray(config.notifiers) ? [...config.notifiers] : [];

    const addNotifierIfMissing = (notifierObj: AnyNotifierConfigInput) => {
      const hasType = (config.notifiers as AnyNotifierConfigInput[]).some(
        (n) => n?.type === notifierObj.type,
      );
      if (!hasType) {
        (config.notifiers as AnyNotifierConfigInput[]).push(notifierObj);
      }
    };

    // Enrich complex object environment variables

    const { EMAIL } = process.env;
    if (!config.accounts && EMAIL) {
      config.accounts = [{ email: EMAIL }];
    }

    const {
      SMTP_HOST,
      SMTP_PORT,
      EMAIL_SENDER_ADDRESS,
      EMAIL_SENDER_NAME,
      EMAIL_RECIPIENT_ADDRESS,
      SMTP_SECURE,
      SMTP_USERNAME,
      SMTP_PASSWORD,
    } = process.env;

    if (
      SMTP_HOST &&
      SMTP_PORT &&
      EMAIL_SENDER_ADDRESS &&
      EMAIL_SENDER_NAME &&
      EMAIL_RECIPIENT_ADDRESS &&
      typeof SMTP_SECURE === 'string'
    ) {
      addNotifierIfMissing({
        type: 'email',
        smtpHost: SMTP_HOST,
        smtpPort: parseInt(SMTP_PORT, 10),
        emailSenderAddress: EMAIL_SENDER_ADDRESS,
        emailSenderName: EMAIL_SENDER_NAME,
        emailRecipientAddress: EMAIL_RECIPIENT_ADDRESS,
        secure: SMTP_SECURE.toLowerCase() === 'true',
        auth:
          SMTP_USERNAME && SMTP_PASSWORD ? { user: SMTP_USERNAME, pass: SMTP_PASSWORD } : undefined,
      });
    }

    const { DISCORD_WEBHOOK, DISCORD_MENTIONED_USERS, DISCORD_MENTIONED_ROLES, DISCORD_SHOW_URL } =
      process.env;
    if (DISCORD_WEBHOOK) {
      addNotifierIfMissing({
        type: 'discord',
        webhookUrl: DISCORD_WEBHOOK,
        mentionedUsers: DISCORD_MENTIONED_USERS ? DISCORD_MENTIONED_USERS.split(',') : undefined,
        mentionedRoles: DISCORD_MENTIONED_ROLES ? DISCORD_MENTIONED_ROLES.split(',') : undefined,
        showUrl: DISCORD_SHOW_URL?.toLowerCase() === 'true',
      });
    }

    const { PUSHOVER_TOKEN, PUSHOVER_USER_ID } = process.env;
    if (PUSHOVER_TOKEN && PUSHOVER_USER_ID) {
      addNotifierIfMissing({
        type: 'pushover',
        token: PUSHOVER_TOKEN,
        userKey: PUSHOVER_USER_ID,
      });
    }

    // Telegram notification config from env
    const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_TOPIC, TELEGRAM_API_URL } = process.env;
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      addNotifierIfMissing({
        type: 'telegram',
        token: TELEGRAM_TOKEN,
        chatId: TELEGRAM_CHAT_ID,
        topic: TELEGRAM_TOPIC ? parseInt(TELEGRAM_TOPIC, 10) : undefined,
        apiUrl: TELEGRAM_API_URL,
      });
    }

    // Apprise notification config from env
    const { APPRISE_API, APPRISE_URLS } = process.env;
    if (APPRISE_API) {
      addNotifierIfMissing({
        type: 'apprise',
        apiUrl: APPRISE_API,
        urls: APPRISE_URLS,
      });
    }

    const { GOTIFY_API_URL, GOTIFY_TOKEN, GOTIFY_PRIORITY } = process.env;
    if (GOTIFY_API_URL && GOTIFY_TOKEN) {
      addNotifierIfMissing({
        type: 'gotify',
        apiUrl: GOTIFY_API_URL,
        token: GOTIFY_TOKEN,
        priority: GOTIFY_PRIORITY ? parseInt(GOTIFY_PRIORITY, 10) : undefined,
      });
    }

    const { SLACK_WEBHOOK } = process.env;
    if (SLACK_WEBHOOK) {
      addNotifierIfMissing({
        type: 'slack',
        webhookUrl: SLACK_WEBHOOK,
      });
    }

    const { NTFY_WEBHOOK, NTFY_PRIORITY, NTFY_TOKEN } = process.env;
    if (NTFY_WEBHOOK && NTFY_PRIORITY && NTFY_TOKEN) {
      addNotifierIfMissing({
        type: 'ntfy',
        webhookUrl: NTFY_WEBHOOK,
        priority: NTFY_PRIORITY,
        token: NTFY_TOKEN,
      });
    }

    const {
      HOMEASSISTANT_INSTANCE,
      HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN,
      HOMEASSISTANT_NOTIFYSERVICE,
      HOMEASSISTANT_CUSTOM_DATA,
    } = process.env;
    if (
      HOMEASSISTANT_INSTANCE &&
      HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN &&
      HOMEASSISTANT_NOTIFYSERVICE
    ) {
      addNotifierIfMissing({
        type: 'homeassistant',
        instance: HOMEASSISTANT_INSTANCE,
        token: HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN,
        notifyservice: HOMEASSISTANT_NOTIFYSERVICE,
        customData: HOMEASSISTANT_CUSTOM_DATA ? JSON.parse(HOMEASSISTANT_CUSTOM_DATA) : undefined,
      });
    }

    const { BARK_KEY, BARK_TITLE, BARK_GROUP, BARK_API_URL } = process.env;
    if (BARK_KEY) {
      addNotifierIfMissing({
        type: 'bark',
        key: BARK_KEY,
        title: BARK_TITLE,
        group: BARK_GROUP,
        apiUrl: BARK_API_URL,
      });
    }

    const { WEBHOOK_URL, WEBHOOK_HEADERS } = process.env;
    if (WEBHOOK_URL) {
      addNotifierIfMissing({
        type: 'webhook',
        url: WEBHOOK_URL,
        headers: WEBHOOK_HEADERS ? JSON.parse(WEBHOOK_HEADERS) : undefined,
      });
    }

    const { BASE_URL, SERVER_PORT } = process.env;
    if (BASE_URL) {
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>) ??= {};
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>).baseUrl = BASE_URL;
    }
    if (SERVER_PORT) {
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>) ??= {};
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>).listenOpts ??= {};
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>).listenOpts!.port = parseInt(
        SERVER_PORT,
        10,
      );

      // Use environment variables to fill blacklisted games list if present
      const { BLACKLISTED_GAMES } = process.env;
      if (BLACKLISTED_GAMES) config.blacklistedGames = BLACKLISTED_GAMES.split(',');
    }

    return config;
  },
  z.object({
    cronSchedule: z
      .string()
      .prefault(process.env.CRON_SCHEDULE ?? '0 0,6,12,18 * * *')
      .meta({
        description:
          'Cron string of when to run the process. *It is recommended to run every 6 hours, otherwise the refresh tokens will expire after 8 hours and a new login will be prompted every run.** If you want the check to occur immediately after the new free game is released, you can offset the cron schedule. For example in a timezone where the free games release at 11:00am: `0 5,11,17,23 * * *`',
        example: '0 5,11,17,23 * * *',
        default: '0 0,6,12,18 * * * (every six hours)',
        env: 'CRON_SCHEDULE',
      }),

    blacklistedGames: z
      .array(z.string())
      .prefault(process.env.BLACKLISTED_GAMES?.split(',').map((g) => g.trim()) ?? [])
      .meta({
        description: 'A list of excluded game titles to skip during processing.',
        example: ['Gigabash Demo', 'Another Blacklisted Game'],
        env: 'BLACKLISTED_GAMES (comma separated)',
      }),

    searchStrategy: z
      .enum(['weekly', 'promotion', 'all'] as const)
      .prefault((process.env.SEARCH_STRATEGY as never) ?? 'all')
      .meta({
        description: `The search criteria for finding free games. 
"weekly": Redeem only the games defined as a weekly free game at https://www.epicgames.com/store/free-games. This uses a different set of APIs from the other search strategies, so it may work in case finding games breaks. Generally is less stable than "promotion" due to a more complex lookup method.
"promotion": Search the entire Epic Games site for any game with a 100% discount. This includes the "weekly" games, plus any uncommon non-weekly temporarily free games. Occasionally excludes the weekly promotion if it's a bundle.
"all": Combines the results from "weekly" and "promotion". Continues if at least one of the APIs works.`,
        example: 'weekly',
        default: 'all',
        env: 'SEARCH_STRATEGY',
      }),

    runOnStartup: z
      .boolean()
      .prefault(process.env.RUN_ON_STARTUP?.toLowerCase() === 'true')
      .meta({
        description: 'If true, the process will run on startup in addition to the scheduled time.',
        example: true,
        default: false,
        env: 'RUN_ON_STARTUP',
      }),

    runOnce: z
      .boolean()
      .prefault(process.env.RUN_ONCE?.toLowerCase() === 'true')
      .meta({
        description:
          "If true, don't schedule runs. Use with RUN_ON_STARTUP to run once and shutdown.",
        example: true,
        default: false,
        env: 'RUN_ONCE',
      }),

    timezone: z
      .string()
      .prefault(process.env.TZ ?? 'UTC')
      .meta({
        description:
          'TZ name from this list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List',
        example: 'America/Chicago',
        default: 'UTC',
        env: 'TZ',
      }),

    intervalTime: z
      .number()
      .int()
      .min(0)
      .prefault(process.env.INTERVAL_TIME ? parseInt(process.env.INTERVAL_TIME, 10) : 60)
      .meta({
        description:
          'The delay interval between runs of each account in seconds. (Only effective when multiple accounts are configured)',
        example: 30,
        default: 60,
        env: 'INTERVAL_TIME',
      }),

    accountConcurrency: z
      .number()
      .int()
      .min(1)
      .prefault(process.env.ACCOUNT_CONCURRENCY ? parseInt(process.env.ACCOUNT_CONCURRENCY, 10) : 3)
      .meta({
        description: 'How many accounts can be processed at the same time',
        example: 1,
        default: 3,
        env: 'ACCOUNT_CONCURRENCY',
      }),

    logLevel: z
      .enum(['silent', 'error', 'warn', 'info', 'debug', 'trace'] as const)
      .prefault((process.env.LOG_LEVEL as never) ?? 'info')
      .meta({
        description: 'Log level in lower case. Can be [silent, error, warn, info, debug, trace]',
        example: 'debug',
        default: 'info',
        env: 'LOG_LEVEL',
      }),

    webPortalConfig: webPortalConfigSchema.optional().meta({
      description: 'Web server configurations for the remote web portal',
    }),

    accounts: z.array(accountConfigSchema).min(1, 'At least one account must be configured').meta({
      description: 'A list of accounts to work with',
    }),

    notifiers: z.array(notifierConfigSchema).optional().meta({
      description:
        'Global default notification configuration. You may configure multiple notifiers, and they will all be triggered simultaneously.',
    }),

    testNotifiers: z
      .boolean()
      .prefault(process.env.TEST_NOTIFIERS?.toLowerCase() === 'true')
      .meta({
        description:
          'When true, the process will send test notifications with a test redirect to example.com for all configured accounts. Be sure to disable this after a successful test. This test will block normal operation until the test link is accessed by one account. The test page can only be used once.',
        example: true,
        default: false,
        env: 'TEST_NOTIFIERS',
      }),

    skipVersionCheck: z
      .boolean()
      .prefault(process.env.SKIP_VERSION_CHECK?.toLowerCase() === 'true')
      .meta({
        description: 'Skip the call to api.github.com that checks for the latest version on launch',
        example: true,
        default: false,
        env: 'SKIP_VERSION_CHECK',
      }),

    browserLaunchTimeout: z
      .number()
      .int()
      .min(1)
      .prefault(
        process.env.BROWSER_LAUNCH_TIMEOUT ? parseInt(process.env.BROWSER_LAUNCH_TIMEOUT, 10) : 15,
      )
      .meta({
        description:
          'In seconds, how long before a stuck Chromium process times out and gets restarted',
        example: 30,
        default: 15,
        env: 'BROWSER_LAUNCH_TIMEOUT',
      }),

    browserLaunchRetryAttempts: z
      .number()
      .int()
      .min(0)
      .prefault(
        process.env.BROWSER_LAUNCH_RETRY_ATTEMPTS
          ? parseInt(process.env.BROWSER_LAUNCH_RETRY_ATTEMPTS, 10)
          : 5,
      )
      .meta({
        description:
          'How many times to attempt retry attempts to launch a browser after it times out',
        example: 2,
        default: 5,
        env: 'BROWSER_LAUNCH_RETRY_ATTEMPTS',
      }),

    browserNavigationTimeout: z
      .number()
      .int()
      .min(0)
      .prefault(
        process.env.BROWSER_NAVIGATION_TIMEOUT
          ? parseInt(process.env.BROWSER_NAVIGATION_TIMEOUT, 10)
          : 30000,
      )
      .meta({
        description:
          'How long in milliseconds the browser navigation will wait before timing out. 0 disables timeout (not recommended). See: https://playwright.dev/docs/api/class-page#page-set-default-navigation-timeout',
        example: 120000,
        default: 30000,
        env: 'BROWSER_NAVIGATION_TIMEOUT',
      }),

    countryCode: z.string().optional().prefault(process.env.COUNTRY_CODE).meta({
      description:
        'The 2 character country code associated with your account. Used when determining if a game is blacklisted for your account. Commonly blacklisted countries: "MO","HK","RU","BY","CN"',
      example: 'RU',
      default: 'blacklisting is not checked',
      env: 'COUNTRY_CODE',
    }),

    deviceAuthClientId: z
      .string()
      .prefault(process.env.DEVICE_AUTH_CLIENT_ID ?? '98f7e42c2e3a4f86a74eb43fbb41ed39')
      .meta({
        description:
          "The Epic Games application client ID used for device code authorization to check your account's ownership of a game. List of available clients [here](https://github.com/Jaren8r/EpicClients).",
        example: 'b070f20729f84693b5d621c904fc5bc2 (Diesel - Dauntless)',
        default: '98f7e42c2e3a4f86a74eb43fbb41ed39 (fortniteNewSwitchGameClient)',
        env: 'DEVICE_AUTH_CLIENT_ID',
      }),

    deviceAuthSecret: z
      .string()
      .prefault(process.env.DEVICE_AUTH_SECRET ?? '0a2449a2-001a-451e-afec-3e812901c4d7')
      .meta({
        description:
          "The Epic Games application secret used for device code authorization to check your account's ownership of a game. List of available clients [here](https://github.com/Jaren8r/EpicClients).",
        example: 'HG@XE&TGCxEJsgT#&_p2]=aRo#~>=>+c6PhR)zXP (Diesel - Dauntless)',
        default: '0a2449a2-001a-451e-afec-3e812901c4d7 (fortniteNewSwitchGameClient client secret)',
        env: 'DEVICE_AUTH_SECRET',
      }),

    deviceAuthPollRateSeconds: z
      .number()
      .int()
      .min(10)
      .prefault(
        process.env.DEVICE_AUTH_POLL_RATE_SECONDS
          ? parseInt(process.env.DEVICE_AUTH_POLL_RATE_SECONDS, 10)
          : 10,
      )
      .meta({
        description:
          'After redirecting to a device authorization verification URL, how often the Epic Games API is polled for a successful login.',
        example: 20,
        default: 10,
        env: 'DEVICE_AUTH_POLL_RATE_SECONDS',
      }),

    errorsDir: z
      .string()
      .prefault(process.env.ERRORS_DIR ?? join(CONFIG_DIR, 'errors'))
      .meta({
        description: 'The full path where the browser automation error screenshots will be output',
        example: '/errors',
        // eslint-disable-next-line no-template-curly-in-string
        default: '${CONFIG_DIR}/errors',
        env: 'ERRORS_DIR',
      }),

    usersDir: z
      .string()
      .prefault(process.env.USERS_DIR ?? join(CONFIG_DIR, 'users'))
      .meta({
        description: 'The full path where the browser automation error screenshots will be output',
        example: '/users',
        // eslint-disable-next-line no-template-curly-in-string
        default: '${CONFIG_DIR}/users',
        env: 'USERS_DIR',
      }),

    notifyEula: z
      .boolean()
      .prefault(process.env.NOTIFY_EULA?.toLowerCase() === 'true')
      .meta({
        description:
          'If false, EULA updates will be automatically accepted. If true, the user will receive a notification to accept the EULA.',
        example: true,
        default: false,
        env: 'NOTIFY_EULA',
      }),
  }),
);

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigInput = z.input<typeof appConfigSchema>;
export type AnyNotifierConfig = z.infer<typeof notifierConfigSchema>;
export type AnyNotifierConfigInput = z.input<typeof notifierConfigSchema>;
export type AccountConfig = z.infer<typeof accountConfigSchema>;
