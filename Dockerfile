# ─────────────────────────────────────────────────────────────
# Docket — production image
# Builds the Vite client and the Express API, then runs a single
# container that serves both (SPA + /api). Supabase stays managed
# (database + auth + storage), so only this one service is deployed.
# ─────────────────────────────────────────────────────────────

# ---- Stage 1: build the client -------------------------------------------
FROM node:22-alpine AS client-build
WORKDIR /app/client
# VITE_* vars are baked into the bundle at build time. .env files are excluded
# from the build context, so they must be passed as build args:
#   docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=...
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
COPY shared/ ../shared/
RUN npm run build

# ---- Stage 2: build the server -------------------------------------------
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src/ ./src/
COPY shared/ ../shared/
RUN npx tsc

# ---- Stage 3: runtime ------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Server code + production deps
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json

# Built client (served by Express at the / path)
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3001
WORKDIR /app/server
CMD ["node", "dist/index.js"]
