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
    # TODO: Is all this Debian BS required?
    # Debian cron wipes the environment, so we save it to a script to load in cron
    printenv | sed 's/^\(.*\)$/export \1/g' > /root/project_env.sh
    # Add the command to the crontab. Debian cron doesn't ensure single instance, so we use flock to ensure it
    echo "${CRON_SCHEDULE} . /root/project_env.sh && cd /usr/app && flock -n /var/lock/epicgames.lock node /usr/app/dist/src/index.js > /proc/1/fd/1 2>/proc/1/fd/2" | crontab -
    # Run the cron process. The container should halt here and wait for the schedule.
    crond -n
fi
echo "Exiting..."
