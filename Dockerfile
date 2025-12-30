# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN npm install -g bun && bun install --frozen-lockfile

# Copy source
COPY . .

# Build the application
# Build the application
ENV NEXT_TELEMETRY_DISABLED=1

# Expose env vars to build (if static generation needs them)
# Note: For public env vars (NEXT_PUBLIC_), they must be present at build time
ARG NEXT_PUBLIC_NHOST_SUBDOMAIN
ARG NEXT_PUBLIC_NHOST_REGION
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN

ENV NEXT_PUBLIC_NHOST_SUBDOMAIN=$NEXT_PUBLIC_NHOST_SUBDOMAIN
ENV NEXT_PUBLIC_NHOST_REGION=$NEXT_PUBLIC_NHOST_REGION
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN

RUN bun run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
