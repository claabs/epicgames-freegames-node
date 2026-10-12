#!/bin/sh

set -e

TEMP_CONFIG="/tmp/config.json"

# Resolve and output the below variables to /tmp/config.json
node --enable-source-maps /usr/app/dist/src/entrypoint-config.js
TZ=$(cat $TEMP_CONFIG | jq -r ".timezone")
RUN_ON_STARTUP=$(cat $TEMP_CONFIG | jq -r ".runOnStartup")
RUN_ONCE=$(cat $TEMP_CONFIG | jq -r ".runOnce")
CRON_SCHEDULE=$(cat $TEMP_CONFIG | jq -r ".cronSchedule")

if [ ! -e /etc/localtime ]; then
    echo "Setting localtime: $TZ"
    ln -snf /usr/share/zoneinfo/"$TZ" /etc/localtime
fi
if [ ! -e /etc/timezone ]; then
    echo "Setting timezone: $TZ"
    echo "$TZ" > /etc/timezone
fi

# If runOnStartup is set, run it once before setting up the schedule
echo "Run on startup: ${RUN_ON_STARTUP}"
if [ "$RUN_ON_STARTUP" = "true" ]; then
    xvfb-run node --enable-source-maps /usr/app/dist/src/index.js
fi

# If runOnce is not set, schedule the process
echo "Run once: ${RUN_ONCE}"
if [ "$RUN_ONCE" = "false" ]; then
    echo "Setting cron schedule as ${CRON_SCHEDULE}"

    # Write the schedule to a local crontab file
    CRON_FILE="/home/node/crontab"
    echo "${CRON_SCHEDULE} cd /usr/app && xvfb-run node --enable-source-maps /usr/app/dist/src/index.js" > "$CRON_FILE"

    # Run Supercronic in the foreground, keeping the container alive
    exec supercronic -no-reap "$CRON_FILE"
fi
echo "Exiting..."
