########
# BASE
########
FROM node:14-alpine as base

WORKDIR /usr/app

########
# BUILD
########
FROM base as build

# Copy all source files
COPY package*.json tsconfig.json ./
COPY src/site/public/package*.json src/site/public/tsconfig.json ./src/site/public/

# Add dev deps
RUN npm ci && cd src/site/public && npm ci

# Copy source code
COPY src src

RUN npm run build

########
# DEPLOY
########
FROM base as deploy

VOLUME [ "/usr/app/config" ]

# Chromium dependencies https://github.com/Zenika/alpine-chrome/blob/master/Dockerfile
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/v3.12/main" >> /etc/apk/repositories \
    && apk add --no-cache \
    libstdc++ \
    chromium \
    harfbuzz \
    nss \
    freetype \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    # App dependencies
    jq \
    tzdata

ENV NODE_ENV production

# Copy package.json for version number
COPY package*.json ./
COPY src/site/public/package*.json src/site/public/tsconfig.json ./src/site/public/

RUN npm ci --only=production && cd src/site/public && npm ci --only=production

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist

COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# backwards compat (from https://success.docker.com/article/use-a-script-to-initialize-stateful-container-data)
RUN ln -s /usr/local/bin/docker-entrypoint.sh / 

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]