# =============================================================================
# STAGE 1: Dependencies - Install and cache workspace dependencies
# =============================================================================
FROM oven/bun:1.2.8 AS bun-runtime

FROM node:22-slim AS deps

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lock ./

# Copy package.json files for all workspace packages used by app and portal.
COPY packages/auth/package.json ./packages/auth/
COPY packages/billing/package.json ./packages/billing/
COPY packages/company/package.json ./packages/company/
COPY packages/db/package.json ./packages/db/
COPY packages/kv/package.json ./packages/kv/
COPY packages/ui/package.json ./packages/ui/
COPY packages/email/package.json ./packages/email/
COPY packages/integration-platform/package.json ./packages/integration-platform/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/analytics/package.json ./packages/analytics/

# Copy app package.json files
COPY apps/app/package.json ./apps/app/
COPY apps/portal/package.json ./apps/portal/

# Install all dependencies
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true bun install --ignore-scripts

# =============================================================================
# STAGE 2: Migrator and Seeder - Use this release's schema and seed code
# =============================================================================
FROM deps AS migrator

WORKDIR /app

# Keep migrations, generated client, and seed data on exactly the same release.
# The upstream Dockerfile referenced an older published @trycompai/db package,
# which can migrate a schema that does not match the application image.
COPY packages/db ./packages/db
RUN cd packages/db \
    && node scripts/generate-prisma-client-js.js \
    && bun build prisma/seed/seed.ts --target=node --packages=external --outfile=/app/seed.mjs

CMD ["sh", "-lc", "cd packages/db && node ../../node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema"]

# =============================================================================
# STAGE 3: App Builder
# =============================================================================
FROM deps AS app-builder

WORKDIR /app

# Copy all source code needed for build
COPY packages ./packages
COPY apps/app ./apps/app

# Bring in node_modules for build and prisma prebuild
COPY --from=deps /app/node_modules ./node_modules

# Build workspace packages and generate the shared Prisma client before Next
# resolves their package exports.
RUN cd packages/db && bun run build \
    && cd ../auth && bun run build \
    && cd ../integration-platform && bun run build \
    && cd ../email && bun run build \
    && cd ../company && bun run build \
    && cd ../billing && bun run build

# Ensure Next build has required public env at build-time
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_PORTAL_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_IS_DUB_ENABLED
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SELF_HOSTED
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL \
    NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_PUBLIC_IS_DUB_ENABLED=$NEXT_PUBLIC_IS_DUB_ENABLED \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SELF_HOSTED=$NEXT_PUBLIC_SELF_HOSTED \
    NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production \
    SKIP_DOCKER_TYPECHECK=true \
    NEXT_OUTPUT_STANDALONE=true \
    NODE_OPTIONS=--max_old_space_size=6144

# Build Next with Node. Bun 1.2.8 does not implement the worker_threads
# options used by Next.js 16's Turbopack worker pool.
RUN cd apps/app \
    && node ../../node_modules/prisma/build/index.js generate --schema=prisma/schema \
    && node ../../packages/db/scripts/fix-generated-extensions.js src/generated/prisma \
    && SKIP_ENV_VALIDATION=true node ../../node_modules/next/dist/bin/next build

# =============================================================================
# STAGE 4: App Production
# =============================================================================
FROM node:22-alpine AS app

WORKDIR /app

# Copy Next standalone output
COPY --from=app-builder /app/apps/app/.next/standalone ./
COPY --from=app-builder /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=app-builder /app/apps/app/public ./apps/app/public

EXPOSE 3000
CMD ["node", "apps/app/server.js"]

# =============================================================================
# STAGE 5: Portal Builder
# =============================================================================
FROM deps AS portal-builder

WORKDIR /app

# Copy all source code needed for build
COPY packages ./packages
COPY apps/portal ./apps/portal

# Bring in node_modules for build and prisma prebuild
COPY --from=deps /app/node_modules ./node_modules

# Build workspace packages and the combined schema for portal build.
RUN cd packages/db && bun run build \
    && cd ../auth && bun run build \
    && cd ../integration-platform && bun run build \
    && cd ../email && bun run build \
    && cd ../company && bun run build \
    && cd ../billing && bun run build
RUN cp packages/db/dist/schema.prisma apps/portal/prisma/schema.prisma

# Ensure Next build has required public env at build-time
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production \
    SKIP_DOCKER_TYPECHECK=true \
    NEXT_OUTPUT_STANDALONE=true \
    NODE_OPTIONS=--max_old_space_size=6144

# Build Next with Node for the same worker_threads compatibility reason as app.
RUN cd apps/portal \
    && node ../../node_modules/prisma/build/index.js generate --schema=prisma/schema \
    && node ../../packages/db/scripts/fix-generated-extensions.js src/generated/prisma \
    && SKIP_ENV_VALIDATION=true node ../../node_modules/next/dist/bin/next build

# =============================================================================
# STAGE 6: Portal Production
# =============================================================================
FROM node:22-alpine AS portal

WORKDIR /app

# Copy Next standalone output for portal
COPY --from=portal-builder /app/apps/portal/.next/standalone ./
COPY --from=portal-builder /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=portal-builder /app/apps/portal/public ./apps/portal/public

EXPOSE 3000
CMD ["node", "apps/portal/server.js"]

# (Trigger.dev hosted; no local runner stage)
