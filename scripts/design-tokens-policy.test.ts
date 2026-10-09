import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { findFixedValues, parseExceptions, scanRepo, scopeDirs } from "./design-tokens-policy";

// SPEC-0008 (Fase 2: design system Serelius). `packages/tokens` is the only source of visual
// customization: this suite scans the repository so a fixed color, font, icon, brand file or
// gradient cannot come back. BDD source: specs/*/0008-fase-2-design-system-serelius/spec.md.
const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const exists = (file: string) => existsSync(join(root, file));
const SKIP = new Set(["node_modules", ".nuxt", ".output", "dist", ".data", ".wrangler", ".git", ".turbo"]);
const walk = (dir: string): string[] =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((name) => {
        if (SKIP.has(name)) return [];
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });
const rel = (path: string) => path.slice(root.length + 1).replace(/\\/g, "/");
const inScope = (dir: string) => walk(join(root, dir)).filter((file) => /\.(vue|ts|tsx|css|json)$/.test(file) && !/\.test\.ts$/.test(file));
const SCOPES = ["apps", "layers", "packages"];
const sources = SCOPES.flatMap(inScope).map((file) => ({ file: rel(file), text: readFileSync(file, "utf8") }));
const STATES = ["defined", "planned", "in-progress", "review", "completed"];
/** The spec moves between state folders; research lives next to it. */
const specResearch = (file: string): string => {
  const state = STATES.find((s) => existsSync(join(root, `specs/${s}/0008-fase-2-design-system-serelius/research/${file}`)));
  return read(`specs/${state ?? "defined"}/0008-fase-2-design-system-serelius/research/${file}`);
};
const tmp: string[] = [];
const makeRoot = (files: Record<string, string>): string => {
  const dir = mkdtempSync(join(tmpdir(), "design-policy-"));
  tmp.push(dir);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
};
afterAll(() => tmp.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
const files = (violations: { file: string }[]) => [...new Set(violations.map((v) => v.file))].sort();

describe("the scanner", () => {
  // SPECSFY: US-002 FR-007 NFR-003 AC-018
  it("reports hex, rgb, raw palette classes, gradients and backdrop effects with file and line, and nothing for semantic classes", () => {
    const sample = ['const a = "#ff0000";', ".x { color: rgb(0 0 0); }", '<p class="text-red-500 bg-gradient-to-r">', '<div class="backdrop-blur">'].join("\n");
    const found = findFixedValues(sample, "x.vue");
    expect(new Set(found.map((f) => f.kind))).toEqual(new Set(["hex", "rgb", "palette-class", "gradient", "backdrop"]));
    expect(found.every((f) => f.file === "x.vue" && f.line >= 1)).toBe(true);
    expect(found.find((f) => f.kind === "hex")).toMatchObject({ line: 1, match: "#ff0000" });
    expect(findFixedValues('<p class="text-default bg-elevated text-primary">', "y.vue")).toEqual([]);
  });

  // SPECSFY: FR-007 US-002 FR-010 AC-019
  it("accepts the documented MFA QR code exception and rejects the same hex in an undocumented file", () => {
    const exceptions = parseExceptions(read(".fireskills/DESIGNSYSTEM.MD"));
    const qr = exceptions.find((e) => e.file === "layers/account/app/components/account/MfaSetupModal.vue");
    expect(qr?.reason.length ?? 0).toBeGreaterThan(10);
    const real = scanRepo(root, { exceptions, kinds: ["hex"] });
    expect(files(real)).not.toContain("layers/account/app/components/account/MfaSetupModal.vue");
    const fake = makeRoot({ "layers/novo/app/Qr.vue": '<div style="background:#000000;color:#ffffff" />' });
    expect(files(scanRepo(fake, { exceptions, kinds: ["hex"] }))).toEqual(["layers/novo/app/Qr.vue"]);
  });

  // SPECSFY: US-003 FR-004 NFR-006 AC-030
  it("keeps the MFA QR code exception on the file that holds the QR code after it moved to layers/account", () => {
    const exceptions = parseExceptions(read(".fireskills/DESIGNSYSTEM.MD"));
    const moved = "layers/account/app/components/account/MfaSetupModal.vue";
    expect(exists(moved)).toBe(true);
    expect(exceptions.some((e) => e.file === moved)).toBe(true);
    const found = files(scanRepo(root, { exceptions, kinds: ["hex"] }));
    expect(found.filter((file) => file.startsWith("layers/account/"))).toEqual([]);
  });

  // SPECSFY: FR-007 US-002 NFR-003 AC-020
  it("discovers apps/*, layers/* and packages/* (except packages/tokens) without a hand-written folder list", () => {
    const fake = makeRoot({
      "apps/foo/app/a.vue": '<i style="color:#ff0000" />',
      "layers/exemplo/app/b.vue": '<i style="color:#ff0000" />',
      "packages/other/c.ts": 'export const c = "#ff0000";',
      "packages/tokens/theme.css": ":root { --x: #ff0000; }",
    });
    expect(scopeDirs(fake).map((dir) => dir.replace(/\\/g, "/").replace(`${fake.replace(/\\/g, "/")}/`, "")).sort()).toEqual(["apps/foo", "layers/exemplo", "packages/other"]);
    expect(files(scanRepo(fake, { kinds: ["hex"] }))).toEqual(["apps/foo/app/a.vue", "layers/exemplo/app/b.vue", "packages/other/c.ts"]);
  });
});

describe("the repository after the migration", () => {
  // SPECSFY: US-002 FR-001 FR-002 AC-003
  it("has no trace of the Nuxfire palettes and fonts", () => {
    expect(files(scanRepo(root, { kinds: ["palette-name", "font-name"], exceptions: [] }))).toEqual([]);
    for (const file of ["packages/tokens/theme.css", "packages/tokens/index.ts"]) {
      expect(read(file), file).not.toMatch(/\b(flame|fire|night|mint)\b|Geist|Montserrat|JetBrains Mono/);
    }
  });

  // SPECSFY: US-002 FR-002 NFR-002 AC-004
  it("declares the font families once: no app config names a font literally", () => {
    for (const app of ["apps/app", "apps/login", "apps/web"]) {
      const config = read(`${app}/nuxt.config.ts`);
      expect(config, app).not.toMatch(/families:\s*\[\s*\{\s*name:\s*"/);
      expect(config, app).toContain("fontFamilies");
    }
  });

  // SPECSFY: US-001 FR-003 US-002 AC-007
  it("uses only Phosphor duotone icons and every one of them exists in @iconify-json/ph", () => {
    const legacy = sources.filter((s) => /i-lucide-|i-simple-icons-/.test(s.text)).map((s) => s.file);
    expect(legacy).toEqual([]);
    const used = new Set(sources.flatMap((s) => [...s.text.matchAll(/\bi-ph-[a-z0-9-]+-duotone\b/g)].map((m) => m[0].replace(/^i-ph-/, ""))));
    const ph = JSON.parse(readFileSync(createRequire(import.meta.url).resolve("@iconify-json/ph/icons.json"), "utf8")).icons as Record<string, unknown>;
    expect(used.size).toBeGreaterThan(40);
    expect([...used].filter((name) => !ph[name])).toEqual([]);
  });

  // SPECSFY: FR-003 US-002 NFR-003 AC-009
  it("drops @iconify-json/lucide and declares @iconify-json/ph where icons render", () => {
    const manifests = ["apps/app", "apps/login", "apps/web", "layers/admin", "layers/billing", "layers/kanban", "layers/notifications", "layers/teams", "packages/tokens"];
    const withLucide = manifests.filter((dir) => /@iconify-json\/lucide/.test(read(`${dir}/package.json`)));
    expect(withLucide).toEqual([]);
    for (const dir of ["apps/app", "apps/login", "apps/web"]) expect(read(`${dir}/package.json`), dir).toContain("@iconify-json/ph");
  });

  // SPECSFY: US-002 FR-005 US-001 AC-013
  it("keeps the brand in packages/tokens/public with no copy in any app and SVG colors taken from theme.css", () => {
    const brand = ["icon-border.svg", "icon-color.svg", "logo-clear.svg", "logo-dark.svg", "favicon.ico"];
    for (const name of brand) expect(exists(`packages/tokens/public/${name}`), name).toBe(true);
    const copies = SCOPES.flatMap((dir) => walk(join(root, dir))).filter((file) => /\/public\//.test(file.replace(/\\/g, "/")) && /(?:logo|icon)[-\w]*\.svg$/.test(file) && !rel(file).startsWith("packages/tokens/"));
    expect(copies.map(rel)).toEqual([]);
    const css = read("packages/tokens/theme.css").toLowerCase();
    for (const name of brand.filter((n) => n.endsWith(".svg"))) {
      const fills = [...read(`packages/tokens/public/${name}`).matchAll(/fill:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase());
      expect(fills.length, name).toBeGreaterThan(0);
      for (const fill of fills) expect(css, `${name} uses ${fill}`).toContain(fill);
    }
  });

  // SPECSFY: FR-005 US-002 NFR-003 AC-014
  it("has no nuxfire*.svg file and no reference to one", () => {
    const old = SCOPES.flatMap((dir) => walk(join(root, dir))).filter((file) => /nuxfire[-\w]*\.svg$/i.test(file));
    expect(old.map(rel)).toEqual([]);
    const refs = sources.filter((s) => /nuxfire[-\w]*\.svg/i.test(s.text)).map((s) => s.file);
    expect(refs).toEqual([]);
  });

  // SPECSFY: FR-005 US-001 NFR-003 AC-015
  it("fails when a brand file is removed or renamed: the set is exactly the five delivered files and index.ts exports them", () => {
    const names = readdirSync(join(root, "packages/tokens/public")).filter((name) => !name.startsWith("pwa-") && !name.startsWith("apple-") && !name.startsWith("maskable-")).sort();
    expect(names).toEqual(["favicon.ico", "icon-border.svg", "icon-color.svg", "logo-clear.svg", "logo-dark.svg"]);
    const index = read("packages/tokens/index.ts");
    expect(index).toMatch(/export const brand\b/);
    for (const name of names) expect(index, name).toContain(name);
  });

  // SPECSFY: FR-006 US-001 US-002 AC-016
  it("has no gradient outside packages/tokens", () => {
    expect(files(scanRepo(root, { kinds: ["gradient"], exceptions: [] }))).toEqual([]);
  });

  // SPECSFY: FR-006 US-001 NFR-001 AC-017
  it("has no backdrop blur or backdrop filter", () => {
    expect(files(scanRepo(root, { kinds: ["backdrop"], exceptions: [] }))).toEqual([]);
  });

  // SPECSFY: US-001 US-002 FR-004 FR-007 AC-036
  it("has no corner above 3px: no rounded-full, rounded-xl or larger, no arbitrary radius over 3px, no border-radius over 3px", () => {
    const radius = (text: string, file: string) => findFixedValues(text, file).filter((v) => v.kind === "radius");
    expect(radius('<i class="rounded-full rounded-[12px] rounded-xl">', "x.vue").map((v) => v.match).sort()).toEqual(["rounded-[12px]", "rounded-full", "rounded-xl"]);
    expect(radius(".a { border-radius: 8px; } .b { border-radius: 2px; }", "x.css").map((v) => v.match)).toEqual(["border-radius: 8px"]);
    expect(radius('<i class="rounded-md rounded-lg rounded-(--sr-radius-sm) rounded-[3px] rounded-none rounded-t-lg">', "y.vue")).toEqual([]);
    expect(files(scanRepo(root, { kinds: ["radius"], exceptions: [] }))).toEqual([]);
    const theme = read("packages/tokens/theme.css");
    for (const m of theme.matchAll(/--(?:sr-)?radius-[\w-]+:\s*([\d.]+)(px|rem)/g)) expect(m[2] === "rem" ? parseFloat(m[1]) * 16 : parseFloat(m[1]), m[0]).toBeLessThanOrEqual(3);
  });

  // SPECSFY: FR-008 FR-001 US-001 NFR-002 FR-006 AC-023
  it("makes apps/web follow the tokens: one theme import, no parallel theme, no old palette, no gradient", () => {
    const web = sources.filter((s) => s.file.startsWith("apps/web/"));
    const themeImports = web.filter((s) => s.file.endsWith(".css")).flatMap((s) => [...s.text.matchAll(/@import\s+"@nuxfire\/tokens\/theme\.css"/g)]);
    expect(themeImports).toHaveLength(1);
    expect(web.filter((s) => /--color-(cta|brand)\s*:/.test(s.text)).map((s) => s.file)).toEqual([]);
    expect(files(scanRepo(root, { kinds: ["palette-name", "gradient"], exceptions: [] }).filter((v) => v.file.startsWith("apps/web/")))).toEqual([]);
  });

  // SPECSFY: FR-005 US-001 US-002 AC-033
  it("keeps no favicon or PWA icon with the Nuxfire content", () => {
    const table = specResearch("identidade-antiga-binarios.md");
    const old = new Set([...table.matchAll(/`([0-9a-f]{64})`/g)].map((m) => m[1]));
    expect(old.size).toBeGreaterThanOrEqual(5);
    const binaries = SCOPES.flatMap((dir) => walk(join(root, dir))).filter((file) => /(favicon\.ico|apple-touch-icon[-\w.]*\.png|maskable-icon[-\w.]*\.png|pwa-[-\w.]*\.png)$/.test(file));
    expect(binaries.length).toBeGreaterThan(0);
    const same = binaries.filter((file) => old.has(createHash("sha256").update(readFileSync(file)).digest("hex"))).map(rel);
    expect(same).toEqual([]);
  });

  // SPECSFY: FR-002 US-001 NFR-002 AC-034
  it("makes the login load fonts through the same mechanism as the other apps", () => {
    const pkg = read("apps/login/package.json");
    const config = read("apps/login/nuxt.config.ts");
    expect(pkg).toContain("@nuxt/fonts");
    expect(config).toContain("@nuxt/fonts");
    expect(config).toContain("fontFamilies");
  });

  // SPECSFY: FR-001 FR-007 US-002 AC-035
  it("reads e-mail colors from the tokens: no fixed value or old palette in packages/emails", () => {
    expect(files(scanRepo(root, { kinds: ["hex", "rgb", "palette-class", "palette-name"], exceptions: [] }).filter((v) => v.file.startsWith("packages/emails/")))).toEqual([]);
    expect(read("packages/tokens/index.ts")).toMatch(/export const emailColors\b/);
  });
});

// SPEC-0010 (Fase 3b), AC-044. The onboarding stepper and its split layout obey the same rules:
// corners of at most 3px, no gradient, no glass, no fixed color; semantic classes only.
describe("the onboarding stepper and layout", () => {
  const ONBOARDING_LAYOUT = "layers/account/app/layouts/onboarding.vue";

  // SPECSFY: US-001 FR-004 NFR-006 AC-044
  it("has a stepper line in sharedUiConfig with corners of at most 3px on trigger and separator", () => {
    const index = read("packages/tokens/index.ts");
    const body = index.slice(index.indexOf("export const sharedUiConfig"));
    const block = /\n {2}stepper:\s*\{([\s\S]*?)\n {2}\},/.exec(body)?.[1] ?? "";
    expect(block, "stepper line in sharedUiConfig").not.toBe("");
    for (const slot of ["trigger", "separator"]) {
      // `\\s` inside the template literal: a bare `\s` there is just "s", and the pattern
      // would demand `trigger:"…"` with no space, failing every formatted line.
      const value = new RegExp(`${slot}:\\s*"([^"]*)"`).exec(block)?.[1] ?? "";
      expect(value, `stepper.${slot}`).toMatch(/\brounded-(none|xs|sm|md)\b|\brounded-\[[0-3]px\]/);
      expect(value, `stepper.${slot}`).not.toMatch(/rounded-(full|lg|xl|2xl|3xl)/);
    }
    expect(block).not.toMatch(/rounded-full/);
  });

  // SPECSFY: US-001 FR-004 NFR-006 AC-044
  it("keeps the onboarding layout free of gradient, glass, fixed color and corners above 3px", () => {
    expect(exists(ONBOARDING_LAYOUT), ONBOARDING_LAYOUT).toBe(true);
    const text = read(ONBOARDING_LAYOUT);
    expect(text).not.toMatch(/gradient/);
    expect(text).not.toMatch(/backdrop-/);
    expect(findFixedValues(text, ONBOARDING_LAYOUT).map((v) => `${v.kind}:${v.match}`)).toEqual([]);
    expect(text).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(text).not.toMatch(/rounded-(full|xl|2xl|3xl)|rounded-\[(?:[4-9]|\d{2,})/);
  });

  // SPECSFY: US-001 FR-004 NFR-006 AC-044
  it("draws the brand panel with semantic classes only", () => {
    expect(exists(ONBOARDING_LAYOUT), ONBOARDING_LAYOUT).toBe(true);
    const text = read(ONBOARDING_LAYOUT);
    expect(text).toMatch(/\b(?:bg|text|border)-(?:default|elevated|muted|primary|inverted|accented|highlighted)\b/);
    expect(text).not.toMatch(/\b(?:bg|text|border|from|to|via)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)(?:-\d+)?\b/);
  });
});
