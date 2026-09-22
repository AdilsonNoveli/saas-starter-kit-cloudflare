// Cloudflare permanently rejects a `new_sqlite_classes` migration for a class
// that already has a live Durable Object (error 10074: "already depended on
// by existing Durable Objects"), and rejects binding a class that no
// migration ever created (error 10061). Whether THIS script already has the
// class is a fact only Cloudflare has — asked for directly, once per deploy,
// instead of guessed. Any doubt (missing token, bad response, an unreadable
// page) throws instead of guessing: a wrong guess here is a silent, one-time,
// irreversible mistake, while a thrown error just needs a retry.
export async function isDurableObjectClassProvisioned(
  params: { className: string; accountId: string; scriptName: string },
): Promise<boolean> {
  // Defensive: this runs through `$resolve(...).apply(...)` (see
  // infra/websockets.ts), where a caller-side mismatch turns into a missing
  // or malformed argument here rather than a caught type error — confirmed
  // by a real deploy crash ("Cannot destructure property 'accountId' of
  // 'undefined'"). `params` is deliberately NOT destructured in the
  // parameter list, so even `params` itself being undefined lands on the
  // check below instead of crashing on destructuring first.
  const safe = (params ?? {}) as Partial<typeof params>;
  const { className, accountId, scriptName } = safe;
  if (!className || !accountId || !scriptName) {
    throw new Error(
      `Cannot verify Durable Object provisioning: missing className/accountId/scriptName ` +
        `(got ${JSON.stringify({ className, accountId, scriptName })}).`,
    );
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error(
      "Cannot verify Durable Object provisioning: CLOUDFLARE_API_TOKEN is not set.",
    );
  }

  const perPage = 100;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(
      `Cannot verify Durable Object provisioning: namespaces API returned HTTP ${res.status}. The token needs Workers Scripts read access on account ${accountId}.`,
    );
  }

  const { result = [] } = (await res.json()) as {
    result?: { class?: string; script?: string | null }[];
  };
  if (result.some((ns) => ns.class === className && ns.script === scriptName))
    return true;
  // A full page may hide more namespaces behind it; the Cloudflare API's
  // pagination cursor for this endpoint isn't verified here, so a full page
  // is reported rather than risking a false "not provisioned".
  if (result.length >= perPage) {
    throw new Error(
      `Cannot verify Durable Object provisioning: account ${accountId} has ${perPage}+ Durable Object namespaces; the result may be incomplete.`,
    );
  }
  return false;
}
