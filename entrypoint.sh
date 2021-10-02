#!/bin/sh

set +e

TEMP_CONFIG="/tmp/config.json"

npm run entrypoint-config
TZ=$(cat $TEMP_CONFIG | jq -r ".timezone")
RUN_ON_STARTUP=$(cat $TEMP_CONFIG | jq -r ".runOnStartup")
RUN_ONCE=$(cat $TEMP_CONFIG | jq -r ".runOnce")
CRON_SCHEDULE=$(cat $TEMP_CONFIG | jq -r ".cronSchedule")

echo "Setting timezone: $TZ"
ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
echo "$TZ" > /etc/timezone

echo "Run on startup: ${RUN_ON_STARTUP}"
echo "Run once: ${RUN_ONCE}"
[ "$RUN_ON_STARTUP" = "true" ] && npm start --prefix /usr/app
if [ "$RUN_ONCE" = "false" ]; then
    echo "Setting cron schedule as ${CRON_SCHEDULE}"
    echo "${CRON_SCHEDULE} npm start --prefix /usr/app" | crontab -
    /usr/sbin/crond -f -l 8
fi
echo "Exiting..."
