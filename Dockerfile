########
# BASE
########
FROM fedora:35 as base

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

ARG TARGETARCH

WORKDIR /usr/app


########
# DEPS
########
FROM base as deps

RUN dnf -y module install nodejs:14/minimal \
    && dnf -y --enablerepo=updates-testing install \
    chromium-headless \
    # App dependencies
    jq \
    tzdata \
    cronie \
    tini \
    && dnf clean all \
    && rm -rf /var/cache/yum


########
# BUILD
########
FROM deps as build

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
    org.opencontainers.image.base.name="fedora:35" \
    org.opencontainers.image.version="latest"

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/lib64/chromium-browser/headless_shell \
    COMMIT_SHA=${COMMIT_SHA} \
    BRANCH=${BRANCH}

EXPOSE 3000

VOLUME [ "/usr/app/config" ]

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
