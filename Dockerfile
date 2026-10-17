########
# BASE
########
FROM node:26-bookworm-slim

WORKDIR /usr/app

ARG TARGETARCH

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update \
    && apt-get install -y --no-install-recommends \
    # App dependencies
    xvfb \
    xauth \
    jq \
    tini \
    ca-certificates \
    # Install browser with deps
    && if [ "$TARGETARCH" = "amd64" ]; then \
    npx playwright install chrome --with-deps; \
    else \
    npx playwright install chromium --with-deps; \
    fi \
    # Install supercronic
    && SUPERCRONIC="supercronic-linux-$TARGETARCH" \
    && SUPERCRONIC_URL="https://github.com/aptible/supercronic/releases/latest/download/$SUPERCRONIC" \
    && wget -O "$SUPERCRONIC" "$SUPERCRONIC_URL" \
    && chmod +x "$SUPERCRONIC" \
    && mv "$SUPERCRONIC" /usr/local/bin/supercronic \
    && rm -rf /var/lib/apt/lists/*

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
