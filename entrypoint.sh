#!/bin/sh

set +e

ENTRYPOINT_CONFIG=$(LOG_LEVEL=error node dist/src/entrypoint-config.js)
RUN_ON_STARTUP=$(echo $ENTRYPOINT_CONFIG | jq -r ".runOnStartup")
CRON_SCHEDULE=$(echo $ENTRYPOINT_CONFIG | jq -r ".cronSchedule")
RUN_ONCE=$(echo $ENTRYPOINT_CONFIG | jq -r ".runOnce")
TZ=$(echo $ENTRYPOINT_CONFIG | jq -r ".timezone")

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
