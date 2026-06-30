# syntax=docker/dockerfile:1

# ---- deps: install node_modules (cached unless lockfile changes) ----
FROM node:22-alpine AS deps
# Next/some deps expect glibc-compatible shims on alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- builder: produce the standalone output ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are INLINED into the client bundle at build time,
# so they must be present now (passed as --build-arg from CI, not at runtime).
ARG NEXT_PUBLIC_API_HTTP_URL
ARG NEXT_PUBLIC_API_WS_URL
ENV NEXT_PUBLIC_API_HTTP_URL=$NEXT_PUBLIC_API_HTTP_URL
ENV NEXT_PUBLIC_API_WS_URL=$NEXT_PUBLIC_API_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# ---- runner: minimal image, just the standalone server ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The standalone server.js reads these to choose where to listen.
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# server.js + its traced minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# static assets and public/ are NOT bundled into standalone by default.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
