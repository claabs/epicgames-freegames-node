########
# BASE
########
FROM node:14-alpine3.14 as base

ENV DISTRO=alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

WORKDIR /usr/app

########
# BUILD
########
FROM base as build

# Copy all source files
COPY package*.json tsconfig.json ./

# Add dev deps
RUN npm ci

# Copy source code
COPY src src

RUN npm run build

########
# DEPS
########
FROM base as deps

# Chromium dependencies https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-on-alpine
# To find latest chromium version for puppeteer, go to https://github.com/puppeteer/puppeteer/blob/v10.4.0/src/revisions.ts,
# select the correct tag for the puppeteer version, and note the chromium revision number. Then go
# to https://omahaproxy.appspot.com/ and in "Find Releases" search for "r<version number>". Then
# ensure that version is published at https://pkgs.alpinelinux.org/package/edge/community/x86_64/chromium
RUN apk add --no-cache \
    'chromium=~93' \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # App dependencies
    jq \
    tzdata \
    tini

########
# DEPLOY
########
FROM deps as deploy

# Copy package.json for version number
COPY package*.json ./

RUN npm ci --only=production

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist

COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# backwards compat (from https://success.docker.com/article/use-a-script-to-initialize-stateful-container-data)
RUN ln -s /usr/local/bin/docker-entrypoint.sh / 

ARG COMMIT_SHA="" \
    BRANCH=""

LABEL org.opencontainers.image.title="epicgames-freegames-node" \ 
    org.opencontainers.image.url="https://github.com/claabs/epicgames-freegames-node" \
    org.opencontainers.image.description="Automatically redeem free games promotions on the Epic Games store" \
    org.opencontainers.image.name="epicgames-freegames-node" \
    org.opencontainers.image.revision=${COMMIT_SHA} \
    org.opencontainers.image.ref.name=${BRANCH} \
    org.opencontainers.image.base.name="node:14-alpine3.14" \
    org.opencontainers.image.version="latest"

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    COMMIT_SHA=${COMMIT_SHA} \
    BRANCH=${BRANCH}

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
