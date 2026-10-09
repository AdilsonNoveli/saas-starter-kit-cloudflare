import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/database/schema.ts",
  out: "./migrations",
  migrations: {
    table: "__drizzle_migrations_account",
    schema: "drizzle",
  },
  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "x",
    password: "x",
    database: "x",
    ssl: false,
  },
});
