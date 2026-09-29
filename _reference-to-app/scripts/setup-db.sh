#!/bin/bash

# Script to set up the Nametag database
# Works in three environments:
# 1. Dev Container (VS Code Remote Containers)
# 2. Local Development (native Node.js with Docker services)
# 3. Docker Compose (legacy/backward compatibility)

set -e  # Exit on error

CONTAINER_NAME="nametag-app"

echo "🚀 Setting up Nametag database..."
echo ""

# Detect environment
if [ -f /.dockerenv ] || [ -n "$REMOTE_CONTAINERS" ]; then
    # Running inside a container (dev container)
    echo "📦 Detected: Dev Container environment"
    RUN_CMD=""
elif command -v npx &> /dev/null && [ -f "package.json" ]; then
    # Local development with Node.js installed
    echo "💻 Detected: Local development environment"
    RUN_CMD=""
elif docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # Docker Compose environment (legacy)
    echo "🐳 Detected: Docker Compose environment"
    RUN_CMD="docker exec ${CONTAINER_NAME}"
else
    echo "❌ Error: Could not detect development environment."
    echo ""
    echo "Please ensure you're in one of these environments:"
    echo "  1. Dev Container (VS Code with Remote Containers extension)"
    echo "  2. Local development (Node.js 20+ installed, run 'npm install' first)"
    echo "  3. Docker Compose (run 'docker-compose up -d' first)"
    exit 1
fi

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if $RUN_CMD npx prisma db execute --stdin <<< "SELECT 1" &> /dev/null; then
        echo "✓ Database is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ Error: Database is not responding after $MAX_RETRIES attempts."
        echo "   Please check your database connection settings."
        exit 1
    fi
    echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo ""

# Run migrations
echo "📦 Running Prisma migrations..."
$RUN_CMD npx prisma migrate deploy

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
$RUN_CMD npx prisma generate

# Seed database
echo "🌱 Seeding database..."
$RUN_CMD npm run seed:dev

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Demo credentials:"
echo "  Email: demo@nametag.one"
echo "  Password: password123"
echo ""
