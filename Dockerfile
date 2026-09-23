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
RUN groupadd --system --gid 1001 closet && useradd --system --uid 1001 --gid closet closet
COPY --from=builder --chown=closet:closet /app/.next/standalone ./
COPY --from=builder --chown=closet:closet /app/.next/static ./.next/static
USER closet
EXPOSE 4173
CMD ["node", "server.js"]
