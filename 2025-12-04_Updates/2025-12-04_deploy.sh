#!/bin/bash
set -e

echo "=== Respon Warga Deployment Script ==="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found!"
  echo "Please create .env.local with DATABASE_URL and other required variables."
  echo "See DEPLOYMENT.md for details."
  exit 1
fi

# Load environment
export $(cat .env.local | grep -v '^#' | xargs)

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env.local"
  exit 1
fi

echo "1. Installing dependencies..."
npm install --silent

echo "2. Running database migrations..."
for f in supabase/migrations/*.sql; do
  filename=$(basename "$f")
  echo "   - $filename"
  node scripts/run-migration.js "$f" 2>/dev/null || echo "     (already applied or skipped)"
done

echo "3. Building application..."
npm run build

echo "4. Starting application..."
if command -v pm2 &> /dev/null; then
  pm2 delete responwarga 2>/dev/null || true
  pm2 start npm --name "responwarga" -- start
  pm2 save
  echo "   Started with PM2"
else
  echo "   PM2 not found. Starting with npm..."
  echo "   Run 'npm start' to start the application"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Application: http://localhost:3535"
echo ""
