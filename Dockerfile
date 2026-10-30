# syntax=docker/dockerfile:1

# Vite 7 needs Node ^20.19 or >=22.12 — do not use 22.5.0
ARG NODE_VERSION=22.14.0
FROM node:${NODE_VERSION}-bookworm-slim AS base

LABEL fly_launch_runtime="Node.js"
WORKDIR /app

FROM base AS build

# Build tools (sharp / native deps) + CA certs for npm/jsDelivr fetches
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      ca-certificates \
      python3 \
      pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Install deps first (package files only). Ignore scripts — postinstall needs
# scripts/bundle-tesseract-assets.mjs which is not copied until the next step.
COPY package-lock.json package.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund \
    && test -x node_modules/.bin/vite

COPY . .

# prebuild runs tesseract bundling; then vite builds dist/
RUN npm run build \
    && test -f dist/index.html

# Drop devDependencies for a smaller runtime image
RUN npm prune --omit=dev


FROM base AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/data \
    DATABASE_PATH=/data/gst_multitenant.db

WORKDIR /app
COPY --from=build /app /app

RUN mkdir -p /data

EXPOSE 8080

# Do NOT use `npm start` — that script rebuilds with vite every boot.
CMD ["node", "server.js"]
