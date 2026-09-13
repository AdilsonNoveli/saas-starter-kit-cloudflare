import { beforeEach, describe, expect, it, vi } from "vitest";

describe("event ledger", () => {
  const store = new Map<string, unknown>();
  const mockKV = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };

  beforeEach(() => {
    store.clear();
    mockKV.get.mockClear();
    mockKV.set.mockClear();
    // See team-seats.test.ts for why stubbing the global (rather than
    // importing hubKV) is the correct way to fake a Nitro auto-import here.
    vi.stubGlobal("hubKV", () => mockKV);
  });

  it("reports an event as unprocessed before it is marked", async () => {
    const { wasEventProcessed } = await import("./event-ledger");
    expect(await wasEventProcessed("stripe", "evt_1")).toBe(false);
  });

  it("reports an event as processed once marked", async () => {
    const { markEventProcessed, wasEventProcessed } =
      await import("./event-ledger");
    await markEventProcessed("stripe", "evt_1");
    expect(await wasEventProcessed("stripe", "evt_1")).toBe(true);
  });

  it("keeps stripe and paddle event ids in separate namespaces", async () => {
    // Providers can generate colliding-looking ids independently of each
    // other; sharing one KV store must not let one provider's event mark the
    // other provider's identically-named event as already handled.
    const { markEventProcessed, wasEventProcessed } =
      await import("./event-ledger");
    await markEventProcessed("stripe", "evt_shared");
    expect(await wasEventProcessed("paddle", "evt_shared")).toBe(false);
  });

  it("sets a TTL of at least Stripe's retry window", async () => {
    const { markEventProcessed } = await import("./event-ledger");
    await markEventProcessed("stripe", "evt_1");

    const [, , options] = mockKV.set.mock.calls[0] ?? [];
    const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;
    expect((options as { ttl: number }).ttl).toBeGreaterThanOrEqual(
      THREE_DAYS_SECONDS,
    );
  });
});
