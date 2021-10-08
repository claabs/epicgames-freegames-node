#!/bin/sh

set -e

TEMP_CONFIG="/tmp/config.json"

# Resolve and output the below variables to /tmp/config.json
npm run entrypoint-config
TZ=$(cat $TEMP_CONFIG | jq -r ".timezone")
RUN_ON_STARTUP=$(cat $TEMP_CONFIG | jq -r ".runOnStartup")
RUN_ONCE=$(cat $TEMP_CONFIG | jq -r ".runOnce")
CRON_SCHEDULE=$(cat $TEMP_CONFIG | jq -r ".cronSchedule")

echo "Setting timezone: $TZ"
ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
echo "$TZ" > /etc/timezone

# If runOnStartup is set, run it once before setting up the schedule
echo "Run on startup: ${RUN_ON_STARTUP}"
if [ "$RUN_ON_STARTUP" = "true" ]; then
    node /usr/app/dist/src/index.js
fi

# If runOnce is not set, schedule the process
echo "Run once: ${RUN_ONCE}"
if [ "$RUN_ONCE" = "false" ]; then
    echo "Setting cron schedule as ${CRON_SCHEDULE}"
    # Add the command to the crontab
    echo "${CRON_SCHEDULE} node /usr/app/dist/src/index.js" | crontab -
    # Run the cron process. The container should halt here and wait for the schedule.
    /usr/sbin/crond -f -l 8
fi
echo "Exiting..."
