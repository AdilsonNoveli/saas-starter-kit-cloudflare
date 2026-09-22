import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDurableObjectClassProvisioned } from "../infra/utils/durable-objects";

const query = {
  className: "Websockets",
  accountId: "acc",
  scriptName: "nuxfire-dev-websocketsscript",
};
const reply = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("isDurableObjectClassProvisioned", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is true when this exact script already owns the class", async () => {
    fetchMock.mockReturnValue(
      reply({ result: [{ class: "Websockets", script: query.scriptName }] }),
    );
    await expect(isDurableObjectClassProvisioned(query)).resolves.toBe(true);
  });

  it("is false when only a different script owns the class — the bug this guards", async () => {
    // Regression: an old deploy under another app/script name left a
    // "Websockets" namespace behind; a substring match on the stage alone
    // wrongly treated it as this script's class, skipping the migration and
    // causing Cloudflare error 10061 on the real, new script.
    fetchMock.mockReturnValue(
      reply({ result: [{ class: "Websockets", script: "other-app-dev-websocketsscript" }] }),
    );
    await expect(isDurableObjectClassProvisioned(query)).resolves.toBe(false);
  });

  it("is false for a fresh account with no namespaces", async () => {
    fetchMock.mockReturnValue(reply({ result: [] }));
    await expect(isDurableObjectClassProvisioned(query)).resolves.toBe(false);
  });

  it("throws when called with a malformed argument instead of crashing on destructuring", async () => {
    // Regression: a real deploy crashed with "Cannot destructure property
    // 'accountId' of 'undefined'" because a caller/signature mismatch passed
    // `undefined` in place of this object — TypeScript did not catch it
    // through the `$resolve(...).apply(...)` chain in infra/websockets.ts.
    // @ts-expect-error — simulating exactly the bad call that reached prod.
    await expect(isDurableObjectClassProvisioned(undefined)).rejects.toThrow(
      /missing className\/accountId\/scriptName/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws without a token instead of guessing", async () => {
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    await expect(isDurableObjectClassProvisioned(query)).rejects.toThrow(
      "CLOUDFLARE_API_TOKEN is not set",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on a non-OK answer, naming the status and the permission", async () => {
    fetchMock.mockReturnValue(reply({ success: false }, 403));
    await expect(isDurableObjectClassProvisioned(query)).rejects.toThrow(
      /HTTP 403.*Workers Scripts/,
    );
  });

  it("throws rather than risk a truncated page hiding the class", async () => {
    fetchMock.mockReturnValue(
      reply({
        result: Array.from({ length: 100 }, (_, i) => ({ class: `C${i}`, script: `s${i}` })),
      }),
    );
    await expect(isDurableObjectClassProvisioned(query)).rejects.toThrow(
      "may be incomplete",
    );
  });
});
