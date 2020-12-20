########
# BASE
########
FROM node:12-alpine as base

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

RUN apk update \
    && apk add jq tzdata \
    && rm -rf /var/cache/apk/*

ADD https://github.com/hjson/hjson-go/releases/download/v3.0.0/linux_amd64.tar.gz /tmp/hjson.tar.gz
RUN tar -xzf /tmp/hjson.tar.gz -C /usr/local/bin && rm -f /tmp/hjson.tar.gz

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