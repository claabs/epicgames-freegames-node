########
# BASE
########
FROM node:26-bookworm-slim

WORKDIR /usr/app

ARG TARGETARCH

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends \
    # App dependencies
    xvfb \
    xauth \
    jq \
    tini \
    wget \
    procps \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install browser with deps
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    if [ "$TARGETARCH" = "amd64" ]; then \
    npx playwright install chrome --with-deps --no-shell; \
    else \
    npx playwright install chromium --with-deps --no-shell; \
    fi \
    && rm -rf /var/lib/apt/lists/*

# Install supercronic
RUN SUPERCRONIC="supercronic-linux-$TARGETARCH" \
    && wget -O "$SUPERCRONIC" "https://github.com/aptible/supercronic/releases/latest/download/$SUPERCRONIC" \
    && chmod +x "$SUPERCRONIC" \
    && mv "$SUPERCRONIC" /usr/local/bin/supercronic

# Add source code
COPY src ./src

COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ARG COMMIT_SHA="" \
    BRANCH=""

# Put COMMIT_SHA in a file, since Docker managers like Portainer will not use updated ENVs
RUN echo $COMMIT_SHA > commit-sha.txt && echo $BRANCH > branch.txt

ENV NODE_ENV=production

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "-s", "--", "/usr/local/bin/docker-entrypoint.sh"]
