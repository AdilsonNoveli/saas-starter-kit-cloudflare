// The SST app name prefixes every Cloudflare resource (`<name>-<stage>-...`), so two
// installations keeping the starter kit's literal name can end up matching each other's
// leftovers in a shared account. Only the Nuxfire reference deploy may keep it.
export const SHARED_APP_NAME = "nuxfire";
export const REFERENCE_DOMAIN = "nuxfire.com";

export interface AppIdentityInput {
  /** `name` read from sst.config.ts; undefined when it could not be read. */
  appName: string | undefined;
  /** BRAND_DOMAIN of the stage; undefined when the branding did not load. */
  domain: string | undefined;
  /** True only when the Cloudflare API showed `domain`'s zone inside the deploy's account. */
  zoneVerified: boolean;
}

/**
 * Whether the deploy still carries the shared starter-kit app name without being the
 * reference deploy. The reference deploy is recognised by evidence, not by declaration:
 * the domain is nuxfire.com AND that zone was found in the account being deployed to,
 * which only the operator of nuxfire.com can satisfy. Anything unproven counts as
 * "not the reference deploy", so a missing Zone:Read permission or an unreachable API
 * keeps the warning instead of silencing it.
 */
export function sharesStarterKitAppName({ appName, domain, zoneVerified }: AppIdentityInput) {
  if (appName !== SHARED_APP_NAME) return false;
  const isReferenceDeploy = domain?.toLowerCase() === REFERENCE_DOMAIN && zoneVerified;
  return !isReferenceDeploy;
}
