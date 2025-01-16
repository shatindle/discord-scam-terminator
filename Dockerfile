FROM node:22-alpine

LABEL org.opencontainers.image.title="Scam Hunter" \
      org.opencontainers.image.description="Targets common discord scams" \
      org.opencontainers.image.authors="@shane on Discord"

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY . .

USER node

COPY --chown=node:node . .

RUN npm install
RUN npm audit fix

ENTRYPOINT ["node", "index.js"]