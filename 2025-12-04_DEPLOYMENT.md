# Respon Warga - Deployment Guide

Complete guide for deploying Respon Warga to a new server with database migration.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running Migrations](#running-migrations)
- [Application Deployment](#application-deployment)
- [Post-Deployment](#post-deployment)

---

## Prerequisites

### Server Requirements
- **Node.js** 18.x or higher
- **npm** or **yarn**
- **PostgreSQL** 14+ (or Docker for containerized setup)

### Optional
- **Docker** & **Docker Compose** (for containerized PostgreSQL)
- **PM2** (for production process management)
- **Nginx** (for reverse proxy)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/OutsmartingDisaster/responwarga.git
cd responwarga
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create `.env.local` in the project root:

```env
# Database Connection
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME

# Optional: Individual DB params (used by some scripts)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=responwarga
DB_USER=responwarga
DB_PASSWORD=your_secure_password

# Map uses CartoDB grey basemap - no API key needed!
```

---

## Database Setup

### Option A: Docker PostgreSQL (Recommended for Development)

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name responwarga-db \
  -e POSTGRES_USER=responwarga \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=responwarga \
  -p 5432:5432 \
  -v responwarga_data:/var/lib/postgresql/data \
  postgres:16

# Verify connection
docker exec -it responwarga-db psql -U responwarga -d responwarga -c "SELECT 1"
```

### Option B: Existing PostgreSQL Server

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE USER responwarga WITH PASSWORD 'your_secure_password';
CREATE DATABASE responwarga OWNER responwarga;
GRANT ALL PRIVILEGES ON DATABASE responwarga TO responwarga;

# Enable UUID extension
\c responwarga
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Running Migrations

### Migration Files Location

All migrations are in `/db/migrations/` directory:

```
db/migrations/
├── 20251202_001_response_operations.sql
├── 20251204_001_crowdsource.sql
├── 20251204_002_crowdsource_geofence_level.sql
├── 20251204_003_crowdsource_form_fields.sql
├── 20251204_004_crowdsource_multi_geofence.sql
├── 20251204_005_form_fields_media.sql
├── 20251204_006_location_uncertain.sql
├── 20251204_007_map_layers.sql
├── 20251204_008_add_field_types.sql
└── 20251204_009_consent_publish_name.sql
```

### Run All Migrations

**Method 1: Using the migration script**

```bash
# Run individual migration
node scripts/run-migration.js db/migrations/20251204_001_crowdsource.sql

# Run all migrations in order
for f in db/migrations/*.sql; do
  echo "Running: $f"
  node scripts/run-migration.js "$f"
done
```

**Method 2: Direct psql**

```bash
# Run all migrations
for f in db/migrations/*.sql; do
  echo "Running: $f"
  psql $DATABASE_URL -f "$f"
done
```

**Method 3: Single combined migration**

```bash
# Combine all migrations into one file
cat db/migrations/*.sql > all_migrations.sql

# Run combined file
psql $DATABASE_URL -f all_migrations.sql
```

### Verify Migration

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Expected tables:
# - organizations
# - profiles
# - disaster_responses
# - emergency_reports
# - crowdsource_projects
# - crowdsource_submissions
# - crowdsource_geofence_zones
# - crowdsource_form_fields
# - crowdsource_map_layers
# ... and more
```

---

## Application Deployment

### Development Mode

```bash
npm run dev
# Opens at http://localhost:3535
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "responwarga" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Docker Deployment (Production on Port 3535)

The repo ships with a production-ready multi-stage `Dockerfile` that builds the Next.js app and serves it on **port 3535**:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci

FROM base AS builder
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
```

#### Compose workflow

```bash
# Build images (db + app)
docker compose build

# Start stack in background (app exposes :3535)
docker compose up -d

# Tail app logs
docker compose logs -f app
```

The compose file maps `3535:3535` and sets `restart: unless-stopped` to keep production resilient.

#### Running staging & development without interrupting production

1. **Production** stays on `http://localhost:3535` via the default `app` service.
2. **Staging**: duplicate the service (e.g., `app-staging`) in `docker-compose.yml`, point it at a staging `.env`, and publish a different host port such as `3636:3535`. Start it with `docker compose up -d app-staging` so it runs alongside production.
3. **Local development**: run `npm run dev -- --port 4000` directly, or `docker compose run --service-ports app npm run dev -- --hostname 0.0.0.0 --port 4000`. This uses an alternate port so production traffic on 3535 is unaffected.
4. Always target the appropriate database URL (staging vs production) in your `.env` to avoid data collisions.

> Tip: Stop staging/dev containers when finished (`docker compose stop app-staging`) while leaving production running uninterrupted on 3535.

---

## Post-Deployment

### 1. Create Admin User

```bash
# Connect to database
psql $DATABASE_URL

# Insert admin user (password should be hashed - this is example)
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'admin',
  'System Admin'
);
```

### 2. Create Test Organization

```bash
psql $DATABASE_URL -c "
INSERT INTO organizations (name, slug, status)
VALUES ('BPBD Test', 'bpbd-test', 'active')
RETURNING id;
"
```

### 3. Seed Sample Data (Optional)

```bash
# Run seed script for Banjir Sumatra 2025 project
psql $DATABASE_URL -f db/seed_banjir_sumatra_2025.sql
```

### 4. Configure Nginx (Production)

```nginx
server {
    listen 80;
    server_name responwarga.yourdomain.com;

    location / {
        proxy_pass http://localhost:3535;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL with Certbot

```bash
sudo certbot --nginx -d responwarga.yourdomain.com
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check if PostgreSQL is running
systemctl status postgresql
# or for Docker
docker ps | grep postgres
```

### Migration Errors

```bash
# Check for existing tables
psql $DATABASE_URL -c "\dt"

# Drop and recreate (CAUTION: destroys data)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Port Already in Use

```bash
# Find process using port 3535
lsof -i :3535

# Kill process
kill -9 <PID>
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_STADIA_API_KEY` | Yes | Stadia Maps API key for maps |
| `DB_HOST` | No | Database host (alternative to DATABASE_URL) |
| `DB_PORT` | No | Database port |
| `DB_NAME` | No | Database name |
| `DB_USER` | No | Database username |
| `DB_PASSWORD` | No | Database password |

---

## Quick Start Script

Save as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "=== Respon Warga Deployment ==="

# Install dependencies
echo "Installing dependencies..."
npm install

# Run migrations
echo "Running database migrations..."
for f in db/migrations/*.sql; do
  echo "  - $f"
  node scripts/run-migration.js "$f" 2>/dev/null || true
done

# Build application
echo "Building application..."
npm run build

# Start with PM2
echo "Starting application..."
pm2 delete responwarga 2>/dev/null || true
pm2 start npm --name "responwarga" -- start
pm2 save

echo "=== Deployment Complete ==="
echo "Application running at http://localhost:3535"
```

Run with:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Support

For issues, please open a GitHub issue at:
https://github.com/OutsmartingDisaster/responwarga/issues
