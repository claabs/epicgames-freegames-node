########
# BASE
########
FROM node:22-alpine3.22 AS base

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

WORKDIR /usr/app

########
# DEPS
########
FROM base AS deps

# Go to https://hub.docker.com/_/node/ and note the latest stable Alpine version available (e.g. alpine3.19).
# Go to https://pkgs.alpinelinux.org/package/v3.22/community/x86_64/chromium (replace with the latest Alpine version)
# and note the Chromium version available. Then go to https://pptr.dev/chromium-support
# and find the latest version that supports that Chromium version, and update it in the package.json.
RUN apk add --no-cache \
    'chromium=~141' \
    ca-certificates \
    ttf-freefont \
    # App dependencies
    jq \
    tzdata \
    tini

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

# Copy package.json for version number
COPY package*.json ./

RUN npm ci --omit=dev

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist

COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# backwards compat (from https://success.docker.com/article/use-a-script-to-initialize-stateful-container-data)
RUN ln -s /usr/local/bin/docker-entrypoint.sh / 

ARG COMMIT_SHA="" \
    BRANCH=""

# Put COMMIT_SHA in a file, since Docker managers like Portainer will not use updated ENVs
RUN echo $COMMIT_SHA > commit-sha.txt && echo $BRANCH > branch.txt

LABEL org.opencontainers.image.title="epicgames-freegames-node" \ 
    org.opencontainers.image.url="https://github.com/claabs/epicgames-freegames-node" \
    org.opencontainers.image.description="Automatically redeem free games promotions on the Epic Games store" \
    org.opencontainers.image.name="epicgames-freegames-node" \
    org.opencontainers.image.revision=${COMMIT_SHA} \
    org.opencontainers.image.ref.name=${BRANCH} \
    org.opencontainers.image.base.name="node:22-alpine3.22" \
    org.opencontainers.image.version="latest"

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    COMMIT_SHA=${COMMIT_SHA} \
    BRANCH=${BRANCH}

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
