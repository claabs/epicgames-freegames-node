import path from 'node:path';

import z from 'zod';

export const CONFIG_DIR = process.env.CONFIG_DIR ?? 'config';

export const localConfigSchema = z
  .object({
    type: z.literal('local').meta({ examples: ['local'] }),
  })
  .meta({
    title: 'Local Notifier',
    description:
      'For local development only. This just opens the notified URL in your default browser.',
  });

export const appriseConfigSchema = z
  .object({
    type: z.literal('apprise').meta({ examples: ['apprise'] }),
    apiUrl: z.url().meta({
      description: 'The base URL of your Apprise instance. Env: APPRISE_API',
      examples: ['http://localhost:8000'],
    }),
    urls: z
      .string()
      .optional()
      .meta({
        description:
          "One or more URLs identifying where the notification should be sent to. If this field isn't specified then it automatically assumes the settings.APPRISE_STATELESS_URLS in your Apprise instance. More details: https://github.com/caronc/apprise-api#stateless-solution Env: APPRISE_URLS",
        examples: ['mailto://user:pass@gmail.com'],
      }),
  })
  .meta({
    title: 'Apprise Notifier',
    description:
      'Sends a notification to many services via [Apprise API](https://github.com/caronc/apprise-api). Supports 70+ different [notification services](https://github.com/caronc/apprise/wiki#notification-services).',
  });

export const discordConfigSchema = z
  .object({
    type: z.literal('discord').meta({ examples: ['discord'] }),
    webhookUrl: z.url().meta({
      description:
        'Discord channel webhook URL. Guide: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks Env: DISCORD_WEBHOOK',
      examples: [
        'https://discord.com/api/webhooks/123456789123456789/A-abcdefghijklmn-abcdefghijklmnopqrst12345678-abcdefghijklmnop123456',
      ],
    }),
    mentionedUsers: z
      .array(z.string())
      .optional()
      .meta({
        description:
          'A list of Discord user IDs to ping when posting the message. How to get a user ID: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID- Env: DISCORD_MENTIONED_USERS (comma separated)',
        examples: ['["914360712086843432", "914360712086843433"]'],
      }),
    mentionedRoles: z
      .array(z.string())
      .optional()
      .meta({
        description:
          'A list of Discord role IDs to ping when posting the message. To get a role ID: enable developer mode > right click a role > "Copy ID". Env: DISCORD_MENTIONED_ROLES (comma separated)',
        examples: ['["734548250895319070", "734548250895319071"]'],
      }),
    showUrl: z
      .boolean()
      .default(false)
      .meta({
        description:
          'If true, the Discord message will contain the full URL in the message text. Helpful if you need to copy-paste the URL. Env: DISCORD_SHOW_URL',
        examples: [true],
        default: false,
      }),
  })
  .meta({
    title: 'Discord Notifier',
    description: 'Sends a message to a server text channel using a webhook',
  });

export const pushoverConfigSchema = z
  .object({
    type: z.literal('pushover').meta({ examples: ['pushover'] }),
    token: z.string().meta({
      description: 'Guide: https://pushover.net/apps/build Env: PUSHOVER_TOKEN',
      examples: ['a172fyyl9gw99p2xi16tq8hnib48p2'],
    }),
    userKey: z.string().meta({
      description: 'Env: PUSHOVER_USER_ID',
      examples: ['uvgidym7l5ggpwu2r8i1oy6diaapll'],
    }),
  })
  .meta({ title: 'Pushover Notifier', description: 'Sends a pushover message' });

export const telegramConfigSchema = z
  .object({
    type: z.literal('telegram').meta({ examples: ['telegram'] }),
    token: z
      .string()
      .regex(/\d+:[a-zA-Z0-9_-]{35}/)
      .meta({
        description:
          'Telegram bot token obtained here: https://core.telegram.org/bots#3-how-do-i-create-a-bot Env: TELEGRAM_TOKEN',
        examples: ['644739147:AAGMPo-Jz3mKRnHRTnrPEDi7jUF1vqNOD5k'],
      }),
    chatId: z
      .string()
      .nonempty()
      .meta({
        description:
          'Unique identifier for the target chat or username of the target channel. Env: TELEGRAM_CHAT_ID',
        examples: ['-987654321'],
      }),
    topic: z
      .number()
      .int()
      .optional()
      .meta({
        description: 'Identifier for the topic/thread to send the messages. Env: TELEGRAM_TOPIC',
        examples: [5],
      }),
    apiUrl: z.url().default('https://api.telegram.org').meta({
      description: 'Custom Telegram server URL. Env: TELEGRAM_API_URL',
      default: 'https://api.telegram.org',
    }),
  })
  .meta({
    title: 'Telegram Notifier',
    description: 'Sends a message to a group chat using a bot you must set up yourself',
  });

export const gotifyConfigSchema = z
  .object({
    type: z.literal('gotify').meta({ examples: ['gotify'] }),
    apiUrl: z.url().meta({
      description: 'The Gotify server host URL. Env: GOTIFY_API_URL',
      examples: ['https://gotify.net'],
    }),
    token: z
      .string()
      .nonempty()
      .meta({
        description:
          'On the Gotify web UI, Apps > Create Application > reveal the token. Env: GOTIFY_TOKEN',
        examples: ['SnL-wAvmfo_QT'],
      }),
    priority: z
      .number()
      .int()
      .min(0)
      .max(10)
      .default(5)
      .meta({
        description: 'The priority level sent with the message. Env: GOTIFY_PRIORITY',
        examples: [7],
        default: 5,
      }),
  })
  .meta({
    title: 'Gotify Notifier',
    description: 'Sends a message to a self-hosted [Gotify](https://gotify.net/) server',
  });

export const slackConfigSchema = z
  .object({
    type: z.literal('slack').meta({ examples: ['slack'] }),
    webhookUrl: z.url().meta({
      description:
        'slack channel webhook URL. Guide: https://api.slack.com/messaging/webhooks Env: SLACK_WEBHOOK',
      examples: [
        'https://hooks.slack.com/services/T22CE80ABCD/CE3AWABCDEFG/F8jdewBb4fmDDx6fV0abcdefg',
      ],
    }),
  })
  .meta({
    title: 'Slack Notifier',
    description: 'Sends a [slack](https://slack.com/) message using webhook',
  });

export const ntfyConfigSchema = z
  .object({
    type: z.literal('ntfy').meta({ examples: ['ntfy'] }),
    webhookUrl: z.url().meta({
      description:
        'ntfy channel webhook URL. Guide: https://docs.ntfy.sh/publish/ Env: NTFY_WEBHOOK',
      examples: ['https://ntfy.sh/mytopic'],
    }),
    priority: z.string().meta({
      description: 'ntfy channel priority. Guide: https://docs.ntfy.sh/publish/ Env: NTFY_PRIORITY',
      examples: ['urgent'],
    }),
    token: z.string().meta({
      description:
        'ntfy channel token. Guide: https://docs.ntfy.sh/config/#access-tokens Env: NTFY_TOKEN',
      examples: ['tk_yourtoken'],
    }),
  })
  .meta({ title: 'ntfy Notifier', description: 'Sends a ntfy message using webhook' });

export const emailAuthConfigSchema = z
  .object({
    user: z.string().meta({
      description: 'The SMTP username (if necessary) Env: SMTP_USERNAME',
      examples: ['hello@gmail.com'],
    }),
    pass: z.string().meta({
      description: 'The SMTP password (if necessary) Env: SMTP_PASSWORD',
      examples: ['abc123'],
    }),
  })
  .meta({ title: 'Email Auth' });

export const emailConfigSchema = z
  .object({
    type: z.literal('email').meta({ examples: ['email'] }),
    smtpHost: z.string().meta({
      description: 'The outgoing SMTP host name. Env: SMTP_HOST',
      examples: ['smtp.gmail.com'],
    }),
    smtpPort: z
      .number()
      .int()
      .min(0)
      .max(65_535)
      .meta({
        description: 'The outgoing SMTP port (SSL or TLS, see secure). Env: SMTP_PORT',
        examples: [587],
      }),
    emailSenderAddress: z.email().meta({
      description: 'The sender of the email you will receive Env: EMAIL_SENDER_ADDRESS',
      examples: ['hello@gmail.com'],
    }),
    emailSenderName: z.string().meta({
      description: 'The name of the email sender. Env: EMAIL_SENDER_NAME',
      examples: ['Epic Games Free Games'],
    }),
    emailRecipientAddress: z.email().meta({
      description: 'The recipient of the email. Env: EMAIL_RECIPIENT_ADDRESS',
      examples: ['hello@gmail.com'],
    }),
    secure: z
      .boolean()
      .default(false)
      .meta({
        description: 'true for SSL (port 465), false for TLS or unsecure. Env: SMTP_SECURE',
        examples: [true],
        default: false,
      }),
    auth: emailAuthConfigSchema
      .meta({
        description: 'Auth settings for SMTP',
      })
      .optional(),
  })
  .meta({
    title: 'Email Notifier',
    description: `Configuration for sending notifications via email. [Example Gmail settings](https://www.siteground.com/kb/google_free_smtp_server). If you have 2FA setup for your Google account, you'll need to create an [app password](https://support.google.com/mail/answer/185833)`,
  });

export const homeAssistantConfigSchema = z
  .object({
    type: z.literal('homeassistant').meta({ examples: ['homeassistant'] }),
    instance: z.string().meta({
      description: 'Env: HOMEASSISTANT_INSTANCE',
      examples: ['https://homeassistant.example.com'],
    }),
    token: z.string().meta({
      description: 'Env: HOMEASSISTANT_LONG_LIVED_ACCESS_TOKEN',
    }),
    notifyservice: z.string().meta({
      description: 'Env: HOMEASSISTANT_NOTIFYSERVICE',
      examples: ['mobile_app_smartphone_name'],
    }),
    customData: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .meta({
        description:
          "A key-value pair object to additionally pass into the service's data object. Env: HOMEASSISTANT_CUSTOM_DATA (stringified JSON)",
        examples: ['{ "parse_mode": "html" }'],
      }),
  })
  .meta({ title: 'Home Assistant Notifier', description: 'Sends a homeassistant notification' });

export const barkConfigSchema = z
  .object({
    type: z.literal('bark').meta({ examples: ['bark'] }),
    key: z.string().meta({
      description: 'Bark key. Env: BARK_KEY',
    }),
    title: z.string().default('epicgames-freegames-node').meta({
      description: 'Bark title. Env: BARK_TITLE',
      default: 'epicgames-freegames-node',
    }),
    group: z.string().default('epicgames-freegames-node').meta({
      description: 'Bark group. Env: BARK_GROUP',
      default: 'epicgames-freegames-node',
    }),
    apiUrl: z.url().default('https://api.day.app').meta({
      description: 'Custom Bark server URL. Env: BARK_API_URL',
      default: 'https://api.day.app',
    }),
  })
  .meta({
    title: 'Bark Notifier',
    description: 'Send a notification to the Bark iOS app. https://github.com/Finb/Bark',
  });

export const webhookConfigSchema = z
  .object({
    type: z.literal('webhook').meta({ examples: ['webhook'] }),
    url: z.url().meta({
      description: 'Webhook URL. Env: WEBHOOK_URL',
    }),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .meta({
        description:
          'A key-value pair object to pass into the POST request headers. Env: WEBHOOK_HEADERS (stringified JSON)',
        examples: ['{ Authorization: "Bearer ABCD" }'],
      }),
  })
  .meta({
    title: 'Webhook Notifier',
    description:
      'Sends a POST request with the notification contents in the body to a [webhook](https://en.wikipedia.org/wiki/Webhook) URL',
  });

export const notifierConfigSchema = z
  .discriminatedUnion('type', [
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
  ])
  .meta({
    title: 'Generic Notifier',
    id: 'genericNotifier',
  });

export const webPortalConfigSchema = z
  .object({
    baseUrl: z
      .url()
      .default('http://localhost:3000')
      .meta({
        description:
          'The URL base that will be returned when a device token login is required. Env: BASE_URL',
        examples: ['https://epic.example.com'],
        default: 'http://localhost:3000',
      }),

    listenOpts: z
      .object({
        port: z.number().int().optional(),
      })
      .catchall(z.unknown())
      .optional()
      .meta({
        title: 'Listen Options',
        description:
          'Node Net.listen options: https://nodejs.org/api/net.html#net_server_listen_options_callback. Env: SERVER_PORT (for `{port: SERVER_PORT}` only)',
        default: '{ port: 3000 }',
      }),

    serverOpts: z.record(z.string(), z.unknown()).optional().meta({
      title: 'Server Options',
      description:
        'Node HTTPS.createServer options: https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener',
    }),

    localtunnel: z
      .boolean()
      .prefault(process.env.LOCAL_TUNNEL?.toLowerCase() === 'true')
      .meta({
        description:
          'If true, provide a remotely accessible web address via [localtunnel](https://localtunnel.me) without the need to port forward or reverse proxy. Env: LOCAL_TUNNEL',
        examples: [true],
        default: false,
      }),
  })
  .meta({
    title: 'Web Portal Config',
  });

export const accountConfigSchema = z
  .object({
    email: z
      .email()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .prefault(process.env.EMAIL!)
      .meta({
        description: 'Epic Games login email. Env: EMAIL',
        examples: ['example@gmail.com'],
      }),

    notifiers: z.array(notifierConfigSchema).optional().meta({
      description:
        'Notification options for just this account. This overrides any global notification configs. You may configure multiple notifiers, and they will all be triggered simultaneously.',
    }),
  })
  .meta({
    title: 'Account Config',
  });

interface RoughInputSchema {
  notifiers: unknown[];
  [key: string]: unknown;
}

export const appConfigSchema = z.preprocess(
  (input) => {
    // If undefined, default to an empty object so defaults and env vars apply
    if (input === undefined) return {};

    // If it's not a plain object (e.g., a string, number, or array), return it as-is so Zod throws a proper type error instead of swallowing it.
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return input;
    }

    const config = input as RoughInputSchema;

    config.notifiers = Array.isArray(config.notifiers) ? [...config.notifiers] : [];

    const addNotifierIfMissing = (notifierObj: AnyNotifierConfigInput) => {
      const hasType = (config.notifiers as AnyNotifierConfigInput[]).some(
        (n) => n.type === notifierObj.type,
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
        smtpPort: Number.parseInt(SMTP_PORT, 10),
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
        topic: TELEGRAM_TOPIC ? Number.parseInt(TELEGRAM_TOPIC, 10) : undefined,
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
        priority: GOTIFY_PRIORITY ? Number.parseInt(GOTIFY_PRIORITY, 10) : undefined,
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
        customData: HOMEASSISTANT_CUSTOM_DATA
          ? (JSON.parse(HOMEASSISTANT_CUSTOM_DATA) as Record<string, string | number | boolean>)
          : undefined,
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
        headers: WEBHOOK_HEADERS
          ? (JSON.parse(WEBHOOK_HEADERS) as Record<string, string>)
          : undefined,
      });
    }

    const { BASE_URL, SERVER_PORT } = process.env;
    if (BASE_URL) {
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema> | undefined) ??= {};
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>).baseUrl = BASE_URL;
    }
    if (SERVER_PORT) {
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema> | undefined) ??= {};
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>).listenOpts ??= {};
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (config.webPortalConfig as z.input<typeof webPortalConfigSchema>).listenOpts!.port =
        Number.parseInt(SERVER_PORT, 10);

      // Use environment variables to fill blacklisted games list if present
      const { BLACKLISTED_GAMES } = process.env;
      if (BLACKLISTED_GAMES) config.blacklistedGames = BLACKLISTED_GAMES.split(',');
    }

    return config;
  },
  z
    .object({
      cronSchedule: z
        .string()
        .prefault(process.env.CRON_SCHEDULE ?? '0 0,6,12,18 * * *')
        .meta({
          description:
            'Cron string of when to run the process. *It is recommended to run every 6 hours, otherwise the refresh tokens will expire after 8 hours and a new login will be prompted every run.** If you want the check to occur immediately after the new free game is released, you can offset the cron schedule. For example in a timezone where the free games release at 11:00am: `0 5,11,17,23 * * *`. Env: CRON_SCHEDULE',
          examples: ['0 5,11,17,23 * * *'],
          default: '0 0,6,12,18 * * * (every six hours)',
        }),

      blacklistedGames: z
        .array(z.string())
        .prefault(process.env.BLACKLISTED_GAMES?.split(',').map((g) => g.trim()) ?? [])
        .meta({
          description:
            'A list of excluded game titles to skip during processing. Env: BLACKLISTED_GAMES (comma separated)',
          examples: [['Gigabash Demo', 'Another Blacklisted Game']],
        }),

      searchStrategy: z
        .enum(['weekly', 'promotion', 'all'] as const)
        .prefault(
          (process.env.SEARCH_STRATEGY as 'weekly' | 'promotion' | 'all' | undefined) ?? 'all',
        )
        .meta({
          description: `The search criteria for finding free games. 
"weekly": Redeem only the games defined as a weekly free game at https://www.epicgames.com/store/free-games. This uses a different set of APIs from the other search strategies, so it may work in case finding games breaks. Generally is less stable than "promotion" due to a more complex lookup method.
"promotion": Search the entire Epic Games site for any game with a 100% discount. This includes the "weekly" games, plus any uncommon non-weekly temporarily free games. Occasionally excludes the weekly promotion if it's a bundle.
"all": Combines the results from "weekly" and "promotion". Continues if at least one of the APIs works.
Env: SEARCH_STRATEGY`,
          examples: ['weekly'],
          default: 'all',
        }),

      runOnStartup: z
        .boolean()
        .prefault(
          process.env.RUN_ON_STARTUP ? process.env.RUN_ON_STARTUP.toLowerCase() === 'true' : true,
        )
        .meta({
          description:
            'If true, the process will run on startup in addition to the scheduled time. Env: RUN_ON_STARTUP',
          examples: [false],
          default: true,
        }),

      runOnce: z
        .boolean()
        .prefault(process.env.RUN_ONCE?.toLowerCase() === 'true')
        .meta({
          description:
            "If true, don't schedule runs. Use with RUN_ON_STARTUP to run once and shutdown. Env: RUN_ONCE",
          examples: [true],
          default: false,
        }),

      timezone: z
        .string()
        .prefault(process.env.TZ ?? 'UTC')
        .meta({
          description:
            'TZ name from this list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List Env: TZ',
          examples: ['America/Chicago'],
          default: 'UTC',
        }),

      intervalTime: z
        .number()
        .int()
        .min(0)
        .prefault(process.env.INTERVAL_TIME ? Number.parseInt(process.env.INTERVAL_TIME, 10) : 60)
        .meta({
          description:
            'The delay interval between runs of each account in seconds. (Only effective when multiple accounts are configured). Env: INTERVAL_TIME',
          examples: [30],
          default: 60,
        }),

      accountConcurrency: z
        .number()
        .int()
        .min(1)
        .prefault(
          process.env.ACCOUNT_CONCURRENCY
            ? Number.parseInt(process.env.ACCOUNT_CONCURRENCY, 10)
            : 3,
        )
        .meta({
          description:
            'How many accounts can be processed at the same time. Env: ACCOUNT_CONCURRENCY',
          examples: [1],
          default: 3,
        }),

      logLevel: z
        .enum(['silent', 'error', 'warn', 'info', 'debug', 'trace'] as const)
        .prefault(
          (process.env.LOG_LEVEL as
            'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | undefined) ?? 'info',
        )
        .meta({
          description:
            'Log level in lower case. Can be [silent, error, warn, info, debug, trace]. Env: LOG_LEVEL',
          examples: ['debug'],
          default: 'info',
        }),

      webPortalConfig: webPortalConfigSchema.optional().meta({
        description: 'Web server configurations for the remote web portal',
      }),

      accounts: z
        .array(accountConfigSchema)
        .min(1, 'At least one account must be configured')
        .meta({
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
            'When true, the process will send test notifications with a test redirect to example.com for all configured accounts. Be sure to disable this after a successful test. This test will block normal operation until the test link is accessed by one account. The test page can only be used once. Env: TEST_NOTIFIERS',
          examples: [true],
          default: false,
        }),

      skipVersionCheck: z
        .boolean()
        .prefault(process.env.SKIP_VERSION_CHECK?.toLowerCase() === 'true')
        .meta({
          description:
            'Skip the call to api.github.com that checks for the latest version on launch. Env: SKIP_VERSION_CHECK',
          examples: [true],
          default: false,
        }),

      browserLaunchTimeout: z
        .number()
        .int()
        .min(1)
        .prefault(
          process.env.BROWSER_LAUNCH_TIMEOUT
            ? Number.parseInt(process.env.BROWSER_LAUNCH_TIMEOUT, 10)
            : 30,
        )
        .meta({
          description:
            'In seconds, how long before a stuck Chromium process times out and gets restarted. Env: BROWSER_LAUNCH_TIMEOUT',
          examples: [60],
          default: 30,
        }),

      browserLaunchRetryAttempts: z
        .number()
        .int()
        .min(0)
        .prefault(
          process.env.BROWSER_LAUNCH_RETRY_ATTEMPTS
            ? Number.parseInt(process.env.BROWSER_LAUNCH_RETRY_ATTEMPTS, 10)
            : 5,
        )
        .meta({
          description:
            'How many times to attempt retry attempts to launch a browser after it times out. Env: BROWSER_LAUNCH_RETRY_ATTEMPTS',
          examples: [2],
          default: 5,
        }),

      browserNavigationTimeout: z
        .number()
        .int()
        .min(0)
        .prefault(
          process.env.BROWSER_NAVIGATION_TIMEOUT
            ? Number.parseInt(process.env.BROWSER_NAVIGATION_TIMEOUT, 10)
            : 30_000,
        )
        .meta({
          description:
            'How long in milliseconds the browser navigation will wait before timing out. 0 disables timeout (not recommended). See: https://playwright.dev/docs/api/class-page#page-set-default-navigation-timeout Env: BROWSER_NAVIGATION_TIMEOUT',
          examples: [120_000],
          default: 30_000,
        }),

      countryCode: z
        .string()
        .optional()
        .prefault(process.env.COUNTRY_CODE)
        .meta({
          description:
            'The 2 character country code associated with your account. Used when determining if a game is blacklisted for your account. Commonly blacklisted countries: "MO","HK","RU","BY","CN". Env: COUNTRY_CODE',
          examples: ['RU'],
          default: 'blacklisting is not checked',
        }),

      deviceAuthClientId: z
        .string()
        .prefault(process.env.DEVICE_AUTH_CLIENT_ID ?? '98f7e42c2e3a4f86a74eb43fbb41ed39')
        .meta({
          description:
            "The Epic Games application client ID used for device code authorization to check your account's ownership of a game. List of available clients [here](https://github.com/Jaren8r/EpicClients). Env: DEVICE_AUTH_CLIENT_ID",
          examples: ['b070f20729f84693b5d621c904fc5bc2 (Diesel - Dauntless)'],
          default: '98f7e42c2e3a4f86a74eb43fbb41ed39 (fortniteNewSwitchGameClient)',
        }),

      deviceAuthSecret: z
        .string()
        .prefault(process.env.DEVICE_AUTH_SECRET ?? '0a2449a2-001a-451e-afec-3e812901c4d7')
        .meta({
          description:
            "The Epic Games application secret used for device code authorization to check your account's ownership of a game. List of available clients [here](https://github.com/Jaren8r/EpicClients). Env: DEVICE_AUTH_SECRET",
          examples: ['HG@XE&TGCxEJsgT#&_p2]=aRo#~>=>+c6PhR)zXP (Diesel - Dauntless)'],
          default:
            '0a2449a2-001a-451e-afec-3e812901c4d7 (fortniteNewSwitchGameClient client secret)',
        }),

      deviceAuthPollRateSeconds: z
        .number()
        .int()
        .min(10)
        .prefault(
          process.env.DEVICE_AUTH_POLL_RATE_SECONDS
            ? Number.parseInt(process.env.DEVICE_AUTH_POLL_RATE_SECONDS, 10)
            : 10,
        )
        .meta({
          description:
            'After redirecting to a device authorization verification URL, how often the Epic Games API is polled for a successful login. Env: DEVICE_AUTH_POLL_RATE_SECONDS',
          examples: [20],
          default: 10,
        }),

      errorsDir: z
        .string()
        .prefault(process.env.ERRORS_DIR ?? path.join(CONFIG_DIR, 'errors'))
        .meta({
          description:
            'The full path where the browser automation error screenshots will be output. Env: ERRORS_DIR',
          examples: ['/errors'],
          // eslint-disable-next-line no-template-curly-in-string
          default: '${CONFIG_DIR}/errors',
        }),

      usersDir: z
        .string()
        .prefault(process.env.USERS_DIR ?? path.join(CONFIG_DIR, 'users'))
        .meta({
          description:
            'The full path where the browser automation error screenshots will be output. Env: USERS_DIR',
          examples: ['/users'],
          // eslint-disable-next-line no-template-curly-in-string
          default: '${CONFIG_DIR}/users',
        }),

      notifyEula: z
        .boolean()
        .prefault(process.env.NOTIFY_EULA?.toLowerCase() === 'true')
        .meta({
          description:
            'If false, EULA updates will be automatically accepted. If true, the user will receive a notification to accept the EULA. Env: NOTIFY_EULA',
          examples: [true],
          default: false,
        }),
    })
    .meta({ title: 'Application Config' }),
);

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigInput = z.input<typeof appConfigSchema>;
export type AnyNotifierConfig = z.infer<typeof notifierConfigSchema>;
export type AnyNotifierConfigInput = z.input<typeof notifierConfigSchema>;
export type AccountConfig = z.infer<typeof accountConfigSchema>;
