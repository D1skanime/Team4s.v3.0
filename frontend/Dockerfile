FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_TOKEN
ARG NEXT_PUBLIC_AUTH_DISPLAY_NAME
ARG NEXT_PUBLIC_RUNTIME_PROFILE
ARG NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE
ARG NEXT_PUBLIC_KEYCLOAK_ENABLED
ARG NEXT_PUBLIC_KEYCLOAK_BASE_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_AUTH_TOKEN=${NEXT_PUBLIC_AUTH_TOKEN}
ENV NEXT_PUBLIC_AUTH_DISPLAY_NAME=${NEXT_PUBLIC_AUTH_DISPLAY_NAME}
ENV NEXT_PUBLIC_RUNTIME_PROFILE=${NEXT_PUBLIC_RUNTIME_PROFILE}
ENV NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE=${NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE}
ENV NEXT_PUBLIC_KEYCLOAK_ENABLED=${NEXT_PUBLIC_KEYCLOAK_ENABLED}
ENV NEXT_PUBLIC_KEYCLOAK_BASE_URL=${NEXT_PUBLIC_KEYCLOAK_BASE_URL}
ENV NEXT_PUBLIC_KEYCLOAK_REALM=${NEXT_PUBLIC_KEYCLOAK_REALM}
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install -y --no-install-recommends webp \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/eslint.config.mjs ./eslint.config.mjs
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/test/fixtures/phase120-image-probe ./test/fixtures/phase120-image-probe
COPY --from=builder /app/src/components/ui/ResponsiveImage.tsx ./src/components/ui/ResponsiveImage.tsx
COPY --from=builder /app/src/components/ui/ResponsiveImage.test.tsx ./src/components/ui/ResponsiveImage.test.tsx
COPY --from=builder /app/vitest.config.ts ./vitest.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start"]
