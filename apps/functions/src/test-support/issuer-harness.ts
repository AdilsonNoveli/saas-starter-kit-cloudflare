import type { KVNamespace } from "@cloudflare/workers-types";
import { issuer } from "@openauthjs/openauth";
import { createClient } from "@openauthjs/openauth/client";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import {
  PasswordProvider,
  ScryptHasher,
} from "@openauthjs/openauth/provider/password";
import type { Provider } from "@openauthjs/openauth/provider/provider";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { Storage, type StorageAdapter } from "@openauthjs/openauth/storage/storage";
import { issueUserSession } from "../session-store";
import { subjects } from "../subjects";

// Test harness for SPEC-0009 (AC-015 to AC-023): the real OpenAuth issuer over
// MemoryStorage, with the same password and code providers auth.ts registers and
// the `success` order section 8 of the spec makes mandatory: `ctx.subject` with
// the stable subject first (the password provider's `invalidate` hook writes the
// hash into ["email", e-mail, "subject"] inside that call, password.js:37-39),
// and only then the issuer's own write of `user:<id>` over it.
//
// The browser flows (`createFlows`) only need a fetch, the storage behind it and
// the codes the e-mail step captured, so the same flows also drive the
// production Worker of auth.ts (see `memoryKv`).

export const ISSUER_URL = "http://auth.test";
export const CLIENT_ID = "app";
export const REDIRECT_URI = "http://localhost/api/auth/callback";

export interface TestPerson {
  id: string;
  name: string;
  image: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

/** A refresh record as issuer.js:168-178 stores it. */
export interface RefreshRecord {
  subject: string;
  properties: { id: string; email: string; sid?: string; provider?: string };
  timeUsed?: number;
  nextToken: string;
}

/** What a set of browser flows needs from the issuer under test. */
export interface FlowTarget {
  fetch(request: Request): Promise<Response>;
  storage: StorageAdapter;
  /** Lower-case e-mail → last code the issuer "sent" to it. */
  sentCodes: Map<string, string>;
}

type SuccessValue =
  | { provider: "password"; email: string }
  | { provider: "code"; claims: Record<string, string> }
  | { provider: "google" | "github"; email: string };

type FederatedName = "google" | "github";

/** Login, password change and refresh flows of a browser against `target`. */
export function createFlows(target: FlowTarget) {
  const { storage, sentCodes } = target;
  let jar = new Map<string, string>();

  const client = createClient({
    issuer: ISSUER_URL,
    clientID: CLIENT_ID,
    fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
      target.fetch(new Request(input, init))) as typeof fetch,
  });

  async function send(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (jar.size) {
      headers.set(
        "cookie",
        [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
      );
    }
    const response = await target.fetch(
      new Request(new URL(path, ISSUER_URL), { ...init, headers }),
    );
    // Node's Headers has getSetCookie(); the Workers type of Headers does not declare it.
    const setCookies = (
      response.headers as unknown as { getSetCookie(): string[] }
    ).getSetCookie();
    for (const cookie of setCookies) {
      const [pair = ""] = cookie.split(";");
      const at = pair.indexOf("=");
      const name = pair.slice(0, at);
      const value = pair.slice(at + 1);
      if (!value || /max-age=0/i.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }
    return response;
  }

  function post(path: string, fields: Record<string, string>) {
    return send(path, { method: "POST", body: new URLSearchParams(fields) });
  }

  // One browser per flow: each login starts from an empty cookie jar.
  async function authorize(provider: string) {
    jar = new Map();
    const query = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      provider,
    });
    return send(`/authorize?${query}`);
  }

  async function exchange(response: Response): Promise<TokenPair> {
    const location = response.headers.get("location") || "";
    const code = location
      ? new URL(location, ISSUER_URL).searchParams.get("code")
      : null;
    if (!code) {
      throw new Error(`login did not finish: ${response.status} ${location}`);
    }
    const exchanged = await client.exchange(code, REDIRECT_URI);
    if (exchanged.err) throw exchanged.err;
    return exchanged.tokens;
  }

  return {
    storage,
    client,
    send,
    authorize,
    exchange,
    async setPassword(email: string, password: string) {
      await Storage.set(
        storage,
        ["email", email.toLowerCase(), "password"],
        await ScryptHasher().hash(password),
      );
    },
    async loginWithPassword(email: string, password: string) {
      await authorize("password");
      return exchange(await post("/password/authorize", { email, password }));
    },
    async loginWithCode(email: string) {
      await authorize("code");
      await post("/code/authorize", { action: "request", email });
      const code = sentCodes.get(email.toLowerCase()) || "";
      return exchange(await post("/code/authorize", { action: "verify", code }));
    },
    /** The full /password/change flow: request a code, verify it, set the new password. */
    async changePassword(email: string, password: string) {
      jar = new Map();
      await send(`/password/change?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`);
      await post("/password/change", { action: "code", email });
      const code = sentCodes.get(email.toLowerCase()) || "";
      await post("/password/change", { action: "verify", code });
      return post("/password/change", {
        action: "update",
        password,
        repeat: password,
      });
    },
    async refreshRecords(userId: string) {
      const records: Array<[string[], RefreshRecord]> = [];
      for await (const entry of Storage.scan<RefreshRecord>(storage, [
        "oauth:refresh",
        `user:${userId}`,
      ])) {
        if (entry[0][1] === `user:${userId}`) records.push(entry);
      }
      return records;
    },
  };
}

export function createIssuerHarness() {
  const storage = MemoryStorage();
  const people = new Map<string, TestPerson>();
  const sentCodes = new Map<string, string>();
  let federatedEmail = "";

  const ok = async () => new Response("ok", { status: 200 });

  // Stand-in for Google and GitHub: the real providers need a round trip to the
  // identity provider. It hands `success` the e-mail the provider reported, which
  // is what auth.ts reads from their userinfo endpoints.
  function federated(type: FederatedName): Provider<{ email: string }> {
    return {
      type,
      init(routes, ctx) {
        routes.get("/authorize", async (c) =>
          ctx.success(c, { email: federatedEmail }),
        );
      },
    };
  }

  const app = issuer({
    storage,
    subjects,
    providers: {
      password: PasswordProvider({
        login: ok,
        register: ok,
        change: ok,
        async sendCode(email, code) {
          sentCodes.set(email.toLowerCase(), code);
        },
      }),
      code: CodeProvider({
        request: ok,
        async sendCode(claims, code) {
          sentCodes.set(claims.email.toLowerCase(), code);
        },
      }),
      google: federated("google"),
      github: federated("github"),
    },
    success: async (ctx, raw) => {
      const value = raw as SuccessValue;
      const email =
        value.provider === "code" ? value.claims.email : value.email;
      const person = people.get(email.toLowerCase());
      if (!person) throw new Error(`unknown test person ${email}`);
      return issueUserSession(ctx, storage, {
        id: person.id,
        name: person.name,
        email,
        image: person.image,
        provider: value.provider,
      });
    },
  });

  const flows = createFlows({
    fetch: async (request) => app.fetch(request),
    storage,
    sentCodes,
  });

  async function loginWithFederated(provider: FederatedName, email: string) {
    federatedEmail = email;
    await flows.authorize(provider);
    return flows.exchange(await flows.send(`/${provider}/authorize`));
  }

  return {
    ...flows,
    addPerson(email: string, person: TestPerson) {
      people.set(email.toLowerCase(), person);
    },
    loginWithFederated,
    async loginWith(
      provider: "password" | "code" | FederatedName,
      email: string,
      password = "",
    ) {
      if (provider === "password") {
        return flows.loginWithPassword(email, password);
      }
      if (provider === "code") return flows.loginWithCode(email);
      return loginWithFederated(provider, email);
    },
  };
}

/**
 * In-memory KVNamespace with the subset CloudflareStorage and the auth Worker's
 * rate limiter call. It honours `expirationTtl` against `Date.now()`, so fake
 * timers move KV expiry the way they move the issuer's clock.
 */
export function memoryKv() {
  const data = new Map<string, { value: string; expiresAt?: number }>();
  function live(key: string) {
    const entry = data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      data.delete(key);
      return undefined;
    }
    return entry.value;
  }
  const kv = {
    async get(key: string, type?: string) {
      const value = live(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key: string, value: string, options: { expirationTtl?: number } = {}) {
      data.set(key, {
        value,
        expiresAt: options.expirationTtl
          ? Date.now() + options.expirationTtl * 1000
          : undefined,
      });
    },
    async delete(key: string) {
      data.delete(key);
    },
    async list(options: { prefix?: string } = {}) {
      const prefix = options.prefix ?? "";
      const keys = [...data.keys()]
        .filter((key) => key.startsWith(prefix) && live(key) !== undefined)
        .sort()
        .map((name) => ({ name }));
      return { keys, list_complete: true, cursor: "" };
    },
  };
  return kv as unknown as KVNamespace;
}
