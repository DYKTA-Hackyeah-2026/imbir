# syntax=docker/dockerfile:1

# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so the layer is cached when only source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# By default the app uses relative API paths and nginx proxies them to the
# backend (avoids the backend's browser CORS restrictions). Provide an absolute
# URL to call the backend directly instead.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN if [ -n "$VITE_API_URL" ]; then echo "VITE_API_URL=$VITE_API_URL" > .env.production; fi && npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# BACKEND_URL / NGINX_PORT are rendered into the nginx config at container start.
ENV BACKEND_URL=https://hackathon-backend.makonew.com
ENV NGINX_PORT=80

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
