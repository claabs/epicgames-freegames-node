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
COPY . .
# Prod deps already installed, add dev deps
RUN npm i

RUN npm run build

########
# DEPLOY
########
FROM base as deploy

VOLUME [ "/usr/app/config" ]

ENV NODE_ENV production

# Copy package.json for version number
COPY package*.json ./

RUN npm ci --only=production

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist/

CMD [ "npm", "start" ]