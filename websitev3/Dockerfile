FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .
RUN npm run build
RUN { npm audit fix || true; }

FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

COPY package*.json ./
RUN npm i --omit=dev
RUN { npm audit fix || true; }

COPY --from=builder /app/build ./build

EXPOSE 3001

CMD ["node", "build"]
