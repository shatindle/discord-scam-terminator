FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN { npm audit fix || true; }

FROM node:24-alpine AS runner

ENV NODE_ENV=production
# ENV HOST=0.0.0.0
# ENV PORT=3000

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
RUN { npm audit fix || true; }

COPY --from=builder /app/build ./build

# EXPOSE 3000

CMD ["node", "build"]
