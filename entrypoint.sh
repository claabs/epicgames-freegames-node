#!/bin/sh

set +e

# This code sucks. I'd use functions, but sh variable indirection makes it hard as hell

echo "Incoming env vars:"
echo "RUN_ON_STARTUP: $RUN_ON_STARTUP"
echo "CRON_SCHEDULE: $CRON_SCHEDULE"
echo "RUN_ONCE: $RUN_ONCE"

if [ -e "/usr/app/config/config.json" ]; then
    CONFIG_JSON="/usr/app/config/config.json"
elif [ -e "/usr/app/config/config.json5" ]; then
    CONFIG_JSON="/usr/app/config/config.json5"
fi

if [ -z ${CONFIG_JSON} ]; then
    echo "No JSON file found"
    C_RUN_ON_STARTUP=null
    C_CRON_SCHEDULE=null
    C_RUN_ONCE=null
else
    echo "Getting settings from JSON: ${CONFIG_JSON}"
    # Luckily JSON5 is a subset of hjson, so we can use that to convert to raw JSON
    hjson -j $CONFIG_JSON > /tmp/config.json
    C_RUN_ON_STARTUP=$(cat /tmp/config.json | jq -r ".runOnStartup")
    C_CRON_SCHEDULE=$(cat /tmp/config.json | jq -r ".cronSchedule")
    C_RUN_ONCE=$(cat /tmp/config.json | jq -r ".runOnce")
    rm -f /tmp/config.json
fi

echo "Setting config variables"
[ "$C_RUN_ON_STARTUP" = "null" ] && C_RUN_ON_STARTUP=$RUN_ON_STARTUP
[ -z "$C_RUN_ON_STARTUP" ] && C_RUN_ON_STARTUP=true
[ "$C_CRON_SCHEDULE" = "null" ] && C_CRON_SCHEDULE=$CRON_SCHEDULE
[ -z "$C_CRON_SCHEDULE" ] && C_CRON_SCHEDULE="0 12 * * *"
[ "$C_RUN_ONCE" = "null" ] && C_RUN_ONCE=$RUN_ONCE
[ -z "$C_RUN_ONCE" ] && C_RUN_ONCE=false



echo "Run on startup: ${C_RUN_ON_STARTUP}"
echo "Run once: ${C_RUN_ONCE}"
[ "$C_RUN_ON_STARTUP" = "true" ] && npm start --prefix /usr/app
if [ "$C_RUN_ONCE" = "false" ]; then
    if [ ! -z "$TZ" ]; then
        echo "Setting timezone: $TZ"
        ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
        echo "$TZ" > /etc/timezone
    fi
    echo "Setting cron schedule as ${C_CRON_SCHEDULE}"
    echo "${C_CRON_SCHEDULE} npm start --prefix /usr/app" | crontab -
    /usr/sbin/crond -f -l 8
fi
echo "Exiting..."
