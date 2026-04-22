# Dockerfile for a Next.js 15 self-hosted site
# Uses a multi-stage build to keep the final image small.
#
# Why multi-stage:
#   Stage 1 (deps): installs all node_modules including devDependencies
#   Stage 2 (builder): runs the Next.js build
#   Stage 3 (runner): only the built output and production deps
#   Result: ~300MB instead of ~1.2GB if we just copied everything

# --------------------------------------------------------------------------
# Stage 1 — Install dependencies
# --------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Why node:20-alpine:
#   Alpine-based images are significantly smaller than the default Debian-based
#   ones. Node 20 is the current LTS and what Vercel uses for Next.js 15.

WORKDIR /app

# Copy package files first, before copying source.
# Why: Docker layer caching. If package.json hasn't changed, Docker reuses
# the cached node_modules layer and skips npm install on subsequent builds.
# Only code changes (not dependency changes) skip this layer.
COPY package.json package-lock.json ./

RUN npm ci --only=production

# --------------------------------------------------------------------------
# Stage 2 — Build
# --------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all dependencies (including dev) for the build step
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build-time environment variables.
# DIRECTORY_PIN is passed as a build arg and set as an env var for the build.
# Why: Next.js bakes environment variables into the static output at build time.
# The PIN is not a secret at runtime — it just needs to be correct at build.
ARG DIRECTORY_PIN
ENV DIRECTORY_PIN=${DIRECTORY_PIN}

# Build the Next.js app
# Why: This compiles all pages, optimizes images, and generates static HTML
# where possible. Output is in .next/
RUN npm run build

# --------------------------------------------------------------------------
# Stage 3 — Production runner
# --------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Security: don't run as root
# Why: If someone achieves code execution in the container, running as a
# non-root user limits what they can do to the host system.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed to run the server
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Own the app files as the nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Why server.js (not 'next start'):
#   Next.js standalone output generates a server.js that doesn't need
#   the full Next.js package. Smaller, faster startup, correct for Docker.
#   Requires `output: 'standalone'` in next.config.ts (see note below).
CMD ["node", "server.js"]

# --------------------------------------------------------------------------
# Note: next.config.ts must include:
#
#   const nextConfig: NextConfig = {
#     output: 'standalone',
#     // ... rest of your config
#   }
#
# Without this, the standalone server.js won't be generated and this
# Dockerfile's final stage will fail.
# --------------------------------------------------------------------------
