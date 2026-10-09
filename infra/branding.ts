import { loadBranding } from "../scripts/branding";

// The installation's identity (BRAND_NAME / BRAND_DOMAIN / BRAND_EMAIL), read from the
// stage's env file — see scripts/branding.ts, the single place that loads and validates it.
// Fails the deploy right here, naming the variable, when a value is missing or malformed.
//
// The working directory is the repository root during `sst deploy` (every other infra file
// resolves its paths from it). This is deploy-time only: Workers can't read files, so
// whatever needs a value at runtime receives it from here (see infra/emails.ts).
export const branding = loadBranding({
  stage: $app.stage,
  root: process.cwd(),
});
