FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173
ENV HOSTNAME=0.0.0.0
ENV CLOSET_DATA_DIR=/app/data
RUN groupadd --system --gid 1001 closet && useradd --system --uid 1001 --gid closet closet
COPY --from=builder --chown=closet:closet /app/.next/standalone ./
COPY --from=builder --chown=closet:closet /app/.next/static ./.next/static
RUN mkdir -p /app/data && chown closet:closet /app/data
USER closet
EXPOSE 4173
VOLUME ["/app/data"]
CMD ["node", "server.js"]
