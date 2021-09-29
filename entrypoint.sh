#!/bin/sh

set +e

TEMP_CONFIG="/tmp/config.json"

npm run entrypoint-config
RUN_ON_STARTUP=$(cat $TEMP_CONFIG | jq -r ".runOnStartup")
CRON_SCHEDULE=$(cat $TEMP_CONFIG | jq -r ".cronSchedule")
RUN_ONCE=$(cat $TEMP_CONFIG | jq -r ".runOnce")
TZ=$(cat $TEMP_CONFIG | jq -r ".timezone")

echo "Run on startup: ${RUN_ON_STARTUP}"
echo "Run once: ${RUN_ONCE}"
[ "$RUN_ON_STARTUP" = "true" ] && npm start --prefix /usr/app
if [ "$RUN_ONCE" = "false" ]; then
    if [ ! -z "$TZ" ]; then
        echo "Setting timezone: $TZ"
        ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
        echo "$TZ" > /etc/timezone
    fi
    echo "Setting cron schedule as ${CRON_SCHEDULE}"
    echo "${CRON_SCHEDULE} npm start --prefix /usr/app" | crontab -
    /usr/sbin/crond -f -l 8
fi
echo "Exiting..."
