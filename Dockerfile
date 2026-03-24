FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

COPY drizzle.config.ts ./
COPY shared ./shared

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["sh", "-c", "NODE_TLS_REJECT_UNAUTHORIZED=0 ./node_modules/.bin/drizzle-kit push --force && node dist/index.cjs"]
