// Zone permissions the production `www` redirect needs (infra/dns.ts → webRedirects). SST
// creates, per redirected hostname, a proxied placeholder DNS record and a forwarding Page
// Rule (.sst/platform/src/components/cloudflare/worker.ts, `createRedirects`). Cloudflare
// rejects each with a 403 at the END of a ~5 minute deploy, so the doctor probes them first.
//
// Each probe is a read-only GET whose accepted token permissions include the write one the
// deploy needs (verified against Cloudflare's OpenAPI spec, `x-api-token-group`):
//   GET /zones/{id}/dns_records  → DNS Read | DNS Write         (deploy: POST needs DNS Write)
//   GET /zones/{id}/pagerules    → Page Rules Read | Write | Zone Read | Zone Write
//                                  (deploy: POST needs Page Rules Write | Zone Write)
// A token holding the Edit permission therefore passes, and one without it gets a 403.

export interface ZonePermissionProbe {
  /** How the permission is labeled in the dashboard's token editor (always set to Edit). */
  label: string;
  path: (zoneId: string) => string;
}

export const REDIRECT_ZONE_PERMISSIONS: readonly ZonePermissionProbe[] = [
  { label: "DNS → Edit", path: (zoneId) => `/zones/${zoneId}/dns_records?per_page=1` },
  { label: "Page Rules → Edit", path: (zoneId) => `/zones/${zoneId}/pagerules` },
];

export interface ZonePermissionReport {
  /** Probes Cloudflare answered with 401/403: the token certainly lacks them. */
  missing: string[];
  /** Probes that got any other answer (5xx, network error): proves nothing either way. */
  unverified: string[];
}

export async function probeZonePermissions({
  token,
  zoneId,
  probes = REDIRECT_ZONE_PERMISSIONS,
  request = fetch,
}: {
  token: string;
  zoneId: string;
  probes?: readonly ZonePermissionProbe[];
  request?: typeof fetch;
}): Promise<ZonePermissionReport> {
  const report: ZonePermissionReport = { missing: [], unverified: [] };
  for (const probe of probes) {
    try {
      const response = await request(
        `https://api.cloudflare.com/client/v4${probe.path(zoneId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 401 || response.status === 403) report.missing.push(probe.label);
      else if (!response.ok) report.unverified.push(probe.label);
    } catch {
      report.unverified.push(probe.label);
    }
  }
  return report;
}
