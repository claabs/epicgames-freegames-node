########
# BASE
########
FROM node:18-alpine3.17 as base

ENV DISTRO=alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

WORKDIR /usr/app

########
# DEPS
########
FROM base as deps

# Go to https://hub.docker.com/_/node/ and note the latest stable Alpine version available (e.g. alpine3.17).
# Go to https://pkgs.alpinelinux.org/package/v3.17/community/x86_64/chromium (replace with the latest Alpine version)
# and note the Chromium version available. Then go to https://github.com/puppeteer/puppeteer/releases?q=chromium&expanded=true
# and find the latest puppeteer version that supports that Chromium version, and update it in the package.json.
RUN apk add --no-cache \
    'chromium=~112' \
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
# DEPLOY
########
FROM deps as deploy

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
RUN echo $COMMIT_SHA > commit-sha.txt

LABEL org.opencontainers.image.title="epicgames-freegames-node" \ 
    org.opencontainers.image.url="https://github.com/claabs/epicgames-freegames-node" \
    org.opencontainers.image.description="Automatically redeem free games promotions on the Epic Games store" \
    org.opencontainers.image.name="epicgames-freegames-node" \
    org.opencontainers.image.revision=${COMMIT_SHA} \
    org.opencontainers.image.ref.name=${BRANCH} \
    org.opencontainers.image.base.name="node:18-alpine3.17" \
    org.opencontainers.image.version="latest"

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    COMMIT_SHA=${COMMIT_SHA} \
    BRANCH=${BRANCH}

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
