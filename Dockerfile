########
# BASE
########
FROM node:26-bookworm-slim AS base

WORKDIR /usr/app

########
# DEPS
########
FROM base AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    # App dependencies
    xvfb \
    xauth \
    jq \
    tzdata \
    cron \
    tini \
    && npx playwright install chrome --with-deps \
    && rm -rf /var/lib/apt/lists/* \
    && mv /root/.cache/ms-playwright /home/node/.cache/ \
    && chown -R node:node /home/node/.cache

########
# BUILD
########
FROM base AS build

# Copy all source files
COPY package*.json tsconfig.json ./

# Add dev deps
RUN npm ci

# Copy source code
COPY src src

RUN npm run build

########
# DEPLOY
########
FROM deps AS deploy


COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# backwards compat (from https://success.docker.com/article/use-a-script-to-initialize-stateful-container-data)
RUN ln -s /usr/local/bin/docker-entrypoint.sh / 

RUN chown -R node:node /usr/app

# Declare user early so chrome is installed to user dir
USER node

# Copy package.json for version number
COPY package*.json ./

RUN npm ci --omit=dev

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist

ARG COMMIT_SHA="" \
    BRANCH=""

# Put COMMIT_SHA in a file, since Docker managers like Portainer will not use updated ENVs
RUN echo $COMMIT_SHA > commit-sha.txt && echo $BRANCH > branch.txt

ENV NODE_ENV=production

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "-s", "--", "docker-entrypoint.sh"]
