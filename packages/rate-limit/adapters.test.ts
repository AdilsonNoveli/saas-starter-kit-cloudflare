import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hubKvStore, kvNamespaceStore, rateLimit } from "@nuxfire/rate-limit";

// Golden sequences recorded by T002 from the two original implementations
// (apps/app/server/utils/rate-limit.ts and apps/functions/src/rate-limit.ts).
interface GoldenCall {
  now: number;
  key: string;
  rule: { limit: number; windowSeconds: number };
  read: { key: string; type?: string };
  write: { key: string; value: number | string; ttl?: number; expirationTtl?: number };
  result: { allowed: boolean; count: number; limit: number };
}
interface GoldenSequence {
  adapter: "hubKvStore" | "kvNamespaceStore";
  original: string;
  calls: GoldenCall[];
}

const golden = JSON.parse(
  readFileSync(new URL("./golden-sequences.json", import.meta.url), "utf8"),
) as { sequences: GoldenSequence[] };

function sequenceFor(adapter: GoldenSequence["adapter"]): GoldenCall[] {
  const found = golden.sequences.find((s) => s.adapter === adapter);
  if (!found) throw new Error(`golden sequence for ${adapter} is missing`);
  return found.calls;
}

// Fake of the NuxtHub `hubKV()` shape the app uses: get(key) / set(key, value, { ttl }).
function fakeHubKv() {
  const data = new Map<string, unknown>();
  const calls = { read: [] as GoldenCall["read"][], write: [] as GoldenCall["write"][] };
  const kv = {
    async get<T>(key: string): Promise<T | null> {
      calls.read.push({ key });
      return data.has(key) ? (data.get(key) as T) : null;
    },
    async set(key: string, value: unknown, options?: { ttl?: number }): Promise<void> {
      calls.write.push({ key, value: value as number, ttl: options?.ttl });
      data.set(key, value);
    },
  };
  return { kv, calls };
}

// Fake of the Cloudflare KVNamespace calls the auth Worker uses:
// get(key, "json") / put(key, string, { expirationTtl }).
function fakeKvNamespace() {
  const data = new Map<string, string>();
  const calls = { read: [] as GoldenCall["read"][], write: [] as GoldenCall["write"][] };
  const kv = {
    async get(key: string, type: string): Promise<unknown> {
      calls.read.push({ key, type });
      const raw = data.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
      calls.write.push({ key, value, expirationTtl: options?.expirationTtl });
      data.set(key, value);
    },
  };
  return { kv, calls };
}

describe("rate-limit KV adapters (AC-008)", () => {
  // SPECSFY: US-002 FR-003 NFR-001 NFR-002 AC-008
  it("hubKvStore reproduces the golden sequence of apps/app/server/utils/rate-limit.ts", async () => {
    const expected = sequenceFor("hubKvStore");
    const { kv, calls } = fakeHubKv();
    const store = hubKvStore(kv as unknown as Parameters<typeof hubKvStore>[0]);

    const results = [];
    for (const call of expected) {
      results.push(await rateLimit(store, call.key, call.rule, () => call.now));
    }

    expect(results).toEqual(expected.map((c) => c.result));
    expect(calls.read).toEqual(expected.map((c) => c.read));
    expect(calls.write).toEqual(expected.map((c) => c.write));
  });

  // SPECSFY: US-002 FR-003 NFR-001 NFR-002 AC-008
  it("kvNamespaceStore reproduces the golden sequence of apps/functions/src/rate-limit.ts", async () => {
    const expected = sequenceFor("kvNamespaceStore");
    const { kv, calls } = fakeKvNamespace();
    const store = kvNamespaceStore(kv as unknown as Parameters<typeof kvNamespaceStore>[0]);

    const results = [];
    for (const call of expected) {
      results.push(await rateLimit(store, call.key, call.rule, () => call.now));
    }

    expect(results).toEqual(expected.map((c) => c.result));
    expect(calls.read).toEqual(expected.map((c) => c.read));
    expect(calls.write).toEqual(expected.map((c) => c.write));
  });

  // SPECSFY: US-002 FR-003 NFR-001 NFR-002 AC-008
  it("both adapters write ratelimit:<key>:<window> with the counter and agree on every result", async () => {
    const hub = sequenceFor("hubKvStore");
    const worker = sequenceFor("kvNamespaceStore");
    const hubFake = fakeHubKv();
    const workerFake = fakeKvNamespace();
    const hubStore = hubKvStore(hubFake.kv as unknown as Parameters<typeof hubKvStore>[0]);
    const workerStore = kvNamespaceStore(
      workerFake.kv as unknown as Parameters<typeof kvNamespaceStore>[0],
    );

    for (const [i, call] of hub.entries()) {
      const a = await rateLimit(hubStore, call.key, call.rule, () => call.now);
      const b = await rateLimit(workerStore, call.key, call.rule, () => call.now);
      expect(a).toEqual(b);
      expect(worker[i]?.result).toEqual(a);
    }

    const windowKey = /^ratelimit:.+:\d+$/;
    for (const [i, write] of hubFake.calls.write.entries()) {
      const other = workerFake.calls.write[i];
      expect(write.key).toMatch(windowKey);
      expect(other?.key).toBe(write.key);
      expect(other?.value).toBe(JSON.stringify(write.value));
      expect(other?.expirationTtl).toBe(write.ttl);
    }
  });
});
