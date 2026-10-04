# syntax=docker/dockerfile:1

# Build with the monorepo root as the context so Dokploy can use this file at
# backend/Dockerfile without relying on a backend-only build context.
# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

# Install full deps (incl. dev) to compile TypeScript.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build

# Drop dev dependencies for the runtime image.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000
# Enable the entrypoint's DB wait + migrations by default; override per environment.
ENV WAIT_FOR_DB=true
ENV RUN_MIGRATIONS=true
WORKDIR /app

# Run as a non-root user.
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --chown=app:app backend/drizzle ./drizzle
COPY --chown=app:app backend/public ./public
COPY --chown=app:app backend/data ./data
COPY --chown=app:app backend/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --chown=app:app backend/package.json backend/package-lock.json ./

RUN chmod +x ./docker-entrypoint.sh

USER app

EXPOSE 3000

# Liveness probe used by Dokploy/Docker.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)throw 0}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
