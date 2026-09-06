// Cloudflare permanently rejects re-sending a `new_sqlite_classes`/
// `new_classes` migration for a Durable Object class that already has any
// live instance (error 10074: "already depended on by existing Durable
// Objects") — this isn't about migration tags, it's a one-time,
// irreversible provisioning step. See _docs/dev-ai/lessons-learned.md for
// the full story of how this was discovered.
//
// Since our own infra code re-runs on every `sst deploy` (there's no
// "first deploy ever" signal exposed by the `transform.worker` callback),
// we ask Cloudflare directly whether this exact stage's script already has
// the class provisioned, and only include the migration when it doesn't —
// so a brand new stage (a Cloudflare account/stage that has never deployed
// this class before) still gets it created automatically, with zero manual
// steps, while an established stage never resends the rejected migration.
export async function isDurableObjectClassProvisioned(
  className: string,
  scriptNameSubstring: string,
): Promise<boolean> {
  const accountId =
    process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  // Can't check — fail toward "already provisioned" (skip the migration).
  // This keeps the common case (an established stage, which is what every
  // deploy after the very first one is) working; a genuinely fresh stage
  // hitting this same failure would instead get a clear, different
  // Cloudflare error about the missing DO namespace, which is far easier
  // to debug than silently reintroducing the permanent 10074 rejection.
  if (!accountId || !token) return true;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces?per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return true;
    const data = (await res.json()) as {
      result?: { class: string; script: string }[];
    };
    return (data.result ?? []).some(
      (ns) =>
        ns.class === className && ns.script.includes(scriptNameSubstring),
    );
  } catch {
    return true;
  }
}
