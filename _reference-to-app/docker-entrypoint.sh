#!/bin/sh
set -e

echo "🚀 Starting Nametag initialization..."

# Construct DATABASE_URL from individual DB_* variables if not already set
if [ -z "${DATABASE_URL}" ]; then
  if [ -n "${DB_HOST}" ] && [ -n "${DB_PORT}" ] && [ -n "${DB_NAME}" ] && [ -n "${DB_USER}" ]; then
    if [ -n "${DB_PASSWORD}" ]; then
      export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    else
      export DATABASE_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    fi
    echo "ℹ️  Constructed DATABASE_URL from DB_* variables"
  else
    echo "❌ Error: Neither DATABASE_URL nor complete DB_* variables are set"
    echo "   Required: DB_HOST, DB_PORT, DB_NAME, DB_USER (DB_PASSWORD is optional)"
    exit 1
  fi
fi

# Function to check if database is ready
wait_for_db() {
  echo "⏳ Waiting for database to be ready..."
  max_attempts=30
  attempt=0

  while [ "${attempt}" -lt "${max_attempts}" ]; do
    # Use node to test database connection with pg library
    if node -e "
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      client.connect()
        .then(() => client.query('SELECT 1'))
        .then(() => { client.end(); process.exit(0); })
        .catch(() => { client.end(); process.exit(1); });
    " 2>/dev/null; then
      echo "✅ Database is ready"
      return 0
    fi

    attempt=$((attempt + 1))
    echo "   Attempt ${attempt}/${max_attempts} - Database not ready yet..."
    sleep 2
  done

  echo "❌ Database failed to become ready after ${max_attempts} attempts"
  return 1
}

# Function to check if migrations are needed
check_migrations_needed() {
  # Try to query the users table - if it fails, we need migrations
  if node -e "
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client.connect()
      .then(() => client.query('SELECT COUNT(*) FROM \"users\" LIMIT 1'))
      .then(() => { client.end(); process.exit(0); })
      .catch(() => { client.end(); process.exit(1); });
  " 2>/dev/null; then
    return 1  # Tables exist, no migration needed
  else
    return 0  # Tables don't exist, migration needed
  fi
}

# Main initialization process
# Wait for database to be ready
wait_for_db

# Check if we need to run migrations
migrations_needed=0
set +e
check_migrations_needed
migrations_needed=$?
set -e

if [ "${migrations_needed}" -eq 0 ]; then
  echo "🔧 Database tables not found - running migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations completed successfully"
else
  echo "ℹ️  Database tables exist - checking for pending migrations..."
  # Still run migrate deploy to apply any new migrations
  npx prisma migrate deploy
  echo "✅ Migration check completed"
fi

# Generate Prisma Client (needed for @prisma/client imports in dev volumes)
# In production images the client is generated at build time and node_modules may not be writable.
if [ "${NODE_ENV}" != "production" ]; then
  echo "🧬 Generating Prisma Client..."
  npx prisma generate
else
  echo "🧬 Skipping Prisma Client generation (NODE_ENV=production)"
fi

# Run production seed to ensure relationship types exist for all users
echo "🌱 Running production seed (relationship types)..."
if [ -f "/app/prisma/seed.production.js" ]; then
  if npm run seed:prod; then
    echo "✅ Production seed completed"
  else
    echo "⚠️  Production seed failed - continuing anyway (app may still work)"
  fi
elif [ -f "/app/prisma/seed.production.ts" ]; then
  # Dev image doesn't build seed.production.js; fall back to tsx (devDependencies are installed)
  if npx tsx prisma/seed.production.ts; then
    echo "✅ Production seed completed"
  else
    echo "⚠️  Production seed failed - continuing anyway (app may still work)"
  fi
else
  echo "ℹ️  Production seed script not found - skipping"
fi

echo "🎉 Database initialization complete!"
echo "🌐 Starting application..."

# Execute the main command (passed as arguments to this script)
exec "$@"
