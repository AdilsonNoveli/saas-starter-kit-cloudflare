import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0009 (Fase 3a), AC-010: moving the account code from apps/app into
// layers/account keeps every name other modules use — tRPC paths, HTTP routes,
// page routes and component tags — with the same input shape.
const root = join(import.meta.dirname, "../../..");
const layer = (path: string) => join(root, "layers/account", path);
const app = (path: string) => join(root, "apps/app", path);
const read = (path: string) => readFileSync(path, "utf8");

const PROCEDURES = [
  "updateProfile",
  "removeProfilePicture",
  "updateProfilePicture",
  "deleteAccount",
  "disableMfa",
  "signOutOtherSessions",
] as const;

// Input contract copied from apps/app/server/trpc/routers/account.ts on
// 2026-10-06; `null` means the procedure takes no input.
const INPUTS: Record<(typeof PROCEDURES)[number], readonly string[] | null> = {
  updateProfile: ["name: z", '.min(2, "Name must be at least 2 characters")', '.max(50, "Name must be max 50 characters")'],
  removeProfilePicture: null,
  updateProfilePicture: ["key: z.string()"],
  deleteAccount: ["confirmEmail: z.string()"],
  disableMfa: null,
  signOutOtherSessions: null,
};

const API_ROUTES = [
  "server/api/mfa/status.get.ts",
  "server/api/mfa/setup.post.ts",
  "server/api/mfa/verify.post.ts",
  "server/api/mfa/challenge.post.ts",
  "server/api/mfa/recovery-codes.post.ts",
  "server/api/upload/profile-picture.ts",
  "server/api/profile-pictures.get.ts",
];

const PAGES = [
  "app/pages/account-settings.vue",
  "app/pages/account-settings/index.vue",
  "app/pages/account-settings/security.vue",
  "app/pages/account-settings/appearance.vue",
];

// File under app/components -> the tag other layers use. Nuxt derives the tag
// from the folder plus the file name and drops a repeated prefix, so the nested
// folders must survive the move.
const COMPONENTS: Record<string, string> = {
  "app/components/account/AccountUserDropdown.vue": "AccountUserDropdown",
  "app/components/account/MfaSetupModal.vue": "AccountMfaSetupModal",
  "app/components/account/MfaRecoveryPanel.vue": "AccountMfaRecoveryPanel",
  "app/components/account/MfaRecoveryCodes.vue": "AccountMfaRecoveryCodes",
  "app/components/avatar/AvatarUploader.vue": "AvatarUploader",
  "app/components/settings/SettingsPanel.vue": "SettingsPanel",
};

function tagFor(path: string): string {
  const [folder = "", file = ""] = path.replace("app/components/", "").split("/");
  const prefix = folder.charAt(0).toUpperCase() + folder.slice(1);
  const name = file.replace(/\.vue$/, "");
  return name.startsWith(prefix) ? name : `${prefix}${name}`;
}

/** Source of one procedure: from its key to the next procedure key (or the end). */
function procedureSource(source: string, name: string): string {
  const start = source.search(new RegExp(`\\b${name}:\\s*protectedProcedure`));
  if (start < 0) return "";
  const rest = source.slice(start + name.length);
  const next = rest.search(new RegExp(`\\b(?:${PROCEDURES.join("|")}):\\s*protectedProcedure`));
  return source.slice(start, next < 0 ? undefined : start + name.length + next);
}

describe("account contract after composition with layers/account", () => {
  // SPECSFY: US-003 FR-004 AC-010
  it("mounts the account router from layers/account under the same key", () => {
    expect(existsSync(layer("package.json")), "layers/account/package.json").toBe(true);
    const pkg = JSON.parse(read(layer("package.json"))) as { name?: string; exports?: Record<string, string> };
    expect(pkg.name).toBe("@nuxfire/layer-account");
    expect(pkg.exports?.["./server/trpc/router"]).toBeDefined();
    expect(read(layer("server/trpc/router.ts"))).toMatch(/\baccount\s*[:,]/);
    expect(read(app("server/trpc/routers/index.ts"))).not.toMatch(/from\s+["']\.\/account["']/);
    expect(existsSync(app("server/trpc/routers/account.ts")), "apps/app/server/trpc/routers/account.ts").toBe(false);
  });

  // SPECSFY: US-003 FR-004 AC-010
  it("keeps the six tRPC procedures with the same input shape", () => {
    const path = layer("server/trpc/account.ts");
    expect(existsSync(path), "layers/account/server/trpc/account.ts").toBe(true);
    const source = read(path);
    for (const name of PROCEDURES) {
      const body = procedureSource(source, name);
      expect(body, `account.${name}`).not.toBe("");
      const input = INPUTS[name];
      if (input === null) {
        expect(body, `account.${name} takes no input`).not.toContain(".input(");
      } else {
        for (const fragment of input) expect(body, `account.${name} input`).toContain(fragment);
      }
    }
  });

  // SPECSFY: US-003 FR-004 AC-010
  it("serves the same MFA, upload and profile-picture routes from layers/account only", () => {
    const missing = API_ROUTES.filter((route) => !existsSync(layer(route)));
    const leftover = API_ROUTES.filter((route) => existsSync(app(route)));
    expect({ missing, leftover }).toEqual({ missing: [], leftover: [] });
  });

  // SPECSFY: US-003 FR-004 AC-010
  it("keeps /account-settings with index, security and appearance, now in layers/account", () => {
    const missing = PAGES.filter((page) => !existsSync(layer(page)));
    const leftover = PAGES.filter((page) => existsSync(app(page)));
    expect({ missing, leftover }).toEqual({ missing: [], leftover: [] });
  });

  // SPECSFY: US-003 FR-004 AC-010
  it("keeps every component tag used by other layers, with no prefix added", () => {
    for (const [path, tag] of Object.entries(COMPONENTS)) expect(tagFor(path), path).toBe(tag);
    const missing = Object.keys(COMPONENTS).filter((path) => !existsSync(layer(path)));
    const leftover = Object.keys(COMPONENTS).filter((path) => existsSync(app(path)));
    expect({ missing, leftover }).toEqual({ missing: [], leftover: [] });
    const config = read(layer("nuxt.config.ts"));
    expect(config).toMatch(/path:\s*["']\.\/components["']/);
    expect(config).not.toMatch(/\bprefix\s*:/);
  });
});
