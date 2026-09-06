// Shared across every native sst.cloudflare.Worker (infra/utils/nuxt.ts,
// infra/auth.ts, infra/jobs.ts, infra/websockets.ts) so all Workers stay on
// the same Cloudflare compatibility date instead of drifting independently.
export const COMPATIBILITY_DATE = "2025-09-01";
export const COMPATIBILITY = {
  date: COMPATIBILITY_DATE,
  flags: ["nodejs_compat"],
};
