########
# BASE
########
FROM node:26-bookworm-slim AS base

WORKDIR /usr/app


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
FROM base AS deploy

ARG TARGETARCH

COPY package*.json ./

RUN npm ci --omit=dev\ 
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    # App dependencies
    xvfb \
    xauth \
    jq \
    tini \
    curl \
    ca-certificates \
    && npx playwright install chrome --with-deps \
    && SUPERCRONIC="supercronic-linux-$TARGETARCH" \
    && SUPERCRONIC_URL="https://github.com/aptible/supercronic/releases/latest/download/$SUPERCRONIC" \
    && curl -fsSLO "$SUPERCRONIC_URL" \
    && chmod +x "$SUPERCRONIC" \
    && mv "$SUPERCRONIC" /usr/local/bin/supercronic \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/* \
    && mv /root/.cache/ms-playwright /home/node/.cache/ \
    && chown -R node:node /home/node/.cache /usr/app


# Declare user early so chrome is installed to user dir
USER node

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist

COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ARG COMMIT_SHA="" \
    BRANCH=""

# Put COMMIT_SHA in a file, since Docker managers like Portainer will not use updated ENVs
RUN echo $COMMIT_SHA > commit-sha.txt && echo $BRANCH > branch.txt

ENV NODE_ENV=production

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "-s", "--", "/usr/local/bin/docker-entrypoint.sh"]
