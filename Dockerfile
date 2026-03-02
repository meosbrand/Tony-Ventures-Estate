FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm rebuild bcrypt && \
    apt-get purge -y python3 make g++ && apt-get autoremove -y

COPY --from=builder /app/dist ./dist

COPY drizzle.config.ts ./
COPY shared ./shared
COPY public ./public

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/index.cjs"]
