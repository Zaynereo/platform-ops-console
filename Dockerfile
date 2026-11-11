FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV SERVE_WEB=true
ENV CORS_ORIGIN=http://localhost:3001
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN npm ci --omit=dev
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/web/dist packages/web/dist
COPY packages/api/src packages/api/src
COPY LICENSE README.md ./
EXPOSE 3001
CMD ["node", "packages/api/dist/index.js"]
