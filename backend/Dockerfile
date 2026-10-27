# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 \
 && npm ci --no-audit --no-fund \
 && apk del .build-deps
COPY . .
RUN npm run build
# Nao enviar mapas de origem nem declaracoes de tipos na imagem de producao
RUN find dist -name '*.map' -delete && find dist -name '*.d.ts' -delete

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 \
 && npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force \
 && apk del .build-deps
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
