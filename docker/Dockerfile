FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.15.0
WORKDIR /workspace
ENV TURBO_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/schemas/package.json packages/schemas/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile
COPY . .
ENV DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused
RUN pnpm db:generate
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM build AS api
ENV NODE_ENV=production
WORKDIR /workspace/apps/api
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]

FROM nginx:stable-alpine AS web
COPY docker/staging-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
