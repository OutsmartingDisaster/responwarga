# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci

FROM base AS builder
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3535 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY package*.json ./
RUN npm ci --omit=dev

EXPOSE 3535
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3535"]
