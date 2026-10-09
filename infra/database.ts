import { secret } from "./secret";

// PostgreSQL, reached from Workers through Cloudflare Hyperdrive (Workers
// can't hold raw TCP connections). Point this at any standard Postgres —
// Supabase, RDS, self-hosted, etc. Hyperdrive just pools/caches the
// connection; the app always speaks plain Postgres wire protocol, so the
// origin is swappable without touching application code.
export const database = new sst.cloudflare.Hyperdrive("AppDB", {
  origin: {
    scheme: "postgres",
    host: secret.DatabaseHost.value,
    port: secret.DatabasePort.value.apply(Number),
    database: secret.DatabaseName.value,
    user: secret.DatabaseUser.value,
    password: secret.DatabasePassword.value,
  },
});
