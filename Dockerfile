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

RUN npx drizzle-kit --help > /dev/null 2>&1 || npm install drizzle-kit

COPY --from=builder /app/dist ./dist

COPY drizzle.config.ts ./
COPY shared ./shared

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["sh", "-c", "NODE_TLS_REJECT_UNAUTHORIZED=0 ./node_modules/.bin/drizzle-kit push --force && node dist/index.cjs"]
