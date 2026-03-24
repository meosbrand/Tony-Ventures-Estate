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

COPY shared ./shared

ENV NODE_ENV=production
ENV PORT=5000
ENV NODE_PG_FORCE_NATIVE=0

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
