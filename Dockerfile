ARG NODE_IMAGE_VERSION="22-alpine"
ARG PNPM_VERSION="10"

# Install dependencies only when needed
FROM node:${NODE_IMAGE_VERSION} AS deps
ARG PNPM_VERSION
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@${PNPM_VERSION}
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:${NODE_IMAGE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY docker/proxy.ts ./src

ARG BASE_PATH

ENV BASE_PATH=$BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/dummy"
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN npm run build-docker; \
    build_status=$?; \
    if [ "${build_status}" -ne 0 ]; then \
      echo "Docker build failed while running npm run build-docker (exit ${build_status})." >&2; \
      echo "Partial .next files:" >&2; \
      find .next -maxdepth 2 -type f 2>/dev/null | head -80 >&2 || true; \
      exit "${build_status}"; \
    fi; \
    if [ ! -f .next/BUILD_ID ]; then \
      echo "Next production build finished, but .next/BUILD_ID was not created." >&2; \
      echo "Partial .next files:" >&2; \
      find .next -maxdepth 2 -type f 2>/dev/null | head -80 >&2 || true; \
      exit 1; \
    fi; \
    rm -rf .next/cache

# Production image, copy all the files and run next
FROM node:${NODE_IMAGE_VERSION} AS runner
WORKDIR /app

ARG PNPM_VERSION
ARG NODE_OPTIONS

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=$NODE_OPTIONS

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN set -x \
    && apk add --no-cache curl \
    && npm install -g pnpm@${PNPM_VERSION}

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 38472

ENV HOSTNAME=0.0.0.0
ENV PORT=38472

CMD ["pnpm", "start-docker"]
