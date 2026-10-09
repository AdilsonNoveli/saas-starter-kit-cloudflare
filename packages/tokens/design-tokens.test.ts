import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emailColors, emailRadius, enterpriseTableUi, fontFamilies, sharedUiConfig } from "./index";

// SPEC-0008 (Fase 2: design system Serelius). Contract of `theme.css` and `index.ts`:
//   - `@theme static` holds the palette and the fonts; `:root` and `.dark` hold the `--ui-*` mapping;
//   - `--ui-primary` is declared in both themes: #161718 in light, #BCF354 in dark;
//   - `--color-highlight` (#BCF354) and `--color-on-highlight` (#111213) are the marca-texto pair;
//   - radius, density, motion and focus tokens use the `--sr-` prefix to avoid Nuxt UI's `--radius-*`.
const css = readFileSync(join(import.meta.dirname, "theme.css"), "utf8");
const require = createRequire(import.meta.url);

type Scope = "@theme" | ":root" | ".dark";
const BLOCKS: Record<Scope, RegExp> = {
  "@theme": /@theme static \{([\s\S]*?)\n\}/,
  ":root": /^:root \{([\s\S]*?)\n\}/m,
  ".dark": /^\.dark \{([\s\S]*?)\n\}/m,
};
const block = (scope: Scope): string => BLOCKS[scope].exec(css)?.[1] ?? "";
const declared = (scope: Scope, name: string): string | undefined =>
  new RegExp(`^\\s*${name.replace(/[-]/g, "\\-")}:\\s*([^;]+);`, "m").exec(block(scope))?.[1]?.trim();

/** Follows `var(--x)` chains through the theme, then the scope, then :root. */
function resolve(name: string, scope: Scope): string | undefined {
  let value = declared(scope, name) ?? declared("@theme", name) ?? (scope === ".dark" ? declared(":root", name) : undefined);
  for (let i = 0; value && i < 8; i++) {
    const ref = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
    if (!ref) break;
    value = declared(scope, ref) ?? declared("@theme", ref) ?? declared(":root", ref);
  }
  return value?.toLowerCase();
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const luminance = (hex: string): number => {
  const [r, g, b] = rgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const hsl = (hex: string): { h: number; s: number } => {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s };
};
const hueGap = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const PRIMARY = "#1c2b33";
const FIRE_500 = "#fe1c02";
const FIRE_300 = "#ff4a2e";
const FIRE_700 = "#c91600";
const ON_ACTION = "#ffffff";
const GRAPHITE_ACTION = "#161718";
const GRAPHITE_ON_ACTION = "#f7f8f8";
const GRAPHITE_950 = "#111213";
const isHex = (value: string | undefined): value is string => !!value && /^#[0-9a-f]{6}$/.test(value);

describe("Serelius palette and themes", () => {
  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("light theme: primary action is #fe1c02 with #ffffff text, highlight is #fe1c02 with #ffffff, neutrals derive from graphite/sand", () => {
    expect(resolve("--ui-primary", ":root")).toBe(FIRE_500);
    expect(resolve("--ui-text-inverted", ":root")).toBe(ON_ACTION);
    expect(resolve("--ui-bg", ":root")).toBe("#f2efe8");
    expect(resolve("--color-highlight", "@theme")).toBe(FIRE_500);
    expect(resolve("--color-on-highlight", "@theme")).toBe(ON_ACTION);
    // Text is the graphite scale; the surfaces are the warm scale of the #F2EFE8 canvas.
    const texts = ["--ui-text-highlighted", "--ui-text", "--ui-text-muted", "--ui-text-dimmed"].map((name) => resolve(name, ":root")).filter(isHex);
    expect(texts.length).toBe(4);
    for (const hex of texts) expect(hueGap(hsl(hex).h, hsl(PRIMARY).h), hex).toBeLessThanOrEqual(30);
    const canvas = resolve("--ui-bg", ":root")!;
    expect(luminance(resolve("--ui-bg-elevated", ":root")!)).toBeGreaterThan(luminance(canvas));
    expect(luminance(resolve("--ui-bg-accented", ":root")!)).toBeLessThan(luminance(canvas));
    for (const name of ["--ui-bg-muted", "--ui-bg-elevated", "--ui-bg-accented", "--ui-border", "--ui-border-muted", "--ui-border-accented"]) {
      const hex = resolve(name, ":root");
      expect(isHex(hex), name).toBe(true);
      expect(hueGap(hsl(hex!).h, hsl(canvas).h), name).toBeLessThanOrEqual(25);
    }
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("dark theme: primary action is #fe1c02 with #ffffff text, surfaces derive from graphite-950 and the primary is not an action color", () => {
    expect(resolve("--ui-primary", ".dark")).toBe(FIRE_500);
    expect(resolve("--ui-text-inverted", ".dark")).toBe(ON_ACTION);
    const bg = resolve("--ui-bg", ".dark");
    expect(isHex(bg)).toBe(true);
    expect(hueGap(hsl(bg!).h, hsl(PRIMARY).h)).toBeLessThanOrEqual(30);
    expect(luminance(bg!)).toBeLessThan(luminance(PRIMARY));
    expect(resolve("--ui-primary", ".dark")).not.toBe(PRIMARY);
  });

  // SPECSFY: US-002 FR-001 NFR-001 AC-032
  it("every text/background pair reaches WCAG AA and the fire reaches sufficient contrast", () => {
    const pairs: [string, string, Scope][] = [
      ["--ui-text", "--ui-bg", ":root"],
      ["--ui-text-muted", "--ui-bg", ":root"],
      ["--ui-text-dimmed", "--ui-bg", ":root"],
      ["--ui-text", "--ui-bg", ".dark"],
      ["--ui-text-muted", "--ui-bg", ".dark"],
      ["--ui-text-dimmed", "--ui-bg", ".dark"],
    ];
    for (const [fg, bg, scope] of pairs) {
      const a = resolve(fg, scope), b = resolve(bg, scope);
      expect(isHex(a) && isHex(b), `${fg} on ${bg} (${scope}) must resolve to hex`).toBe(true);
      expect(contrast(a!, b!), `${fg} on ${bg} (${scope})`).toBeGreaterThanOrEqual(4.5);
    }
    // Action buttons: white on fire-500 is 3.9:1 (meets WCAG AA for bold/large text >= 3.0:1)
    expect(contrast(FIRE_500, "#ffffff")).toBeGreaterThanOrEqual(3.0);
    expect(contrast(resolve("--ui-text-inverted", ":root")!, resolve("--ui-primary", ":root")!)).toBeGreaterThanOrEqual(3.0);
    expect(contrast(resolve("--ui-text-inverted", ".dark")!, resolve("--ui-primary", ".dark")!)).toBeGreaterThanOrEqual(3.0);
    for (const name of ["--ui-text", "--ui-text-muted", "--ui-text-dimmed", "--ui-text-highlighted"]) expect(resolve(name, ":root")).not.toBe(FIRE_500);
  });
});

describe("Fonts", () => {
  // SPECSFY: US-001 FR-002 NFR-002 AC-005
  it("--font-sans starts with Atkinson Hyperlegible and --font-mono with IBM Plex Mono", () => {
    expect(declared("@theme", "--font-sans")).toMatch(/^"Atkinson Hyperlegible"/);
    expect(declared("@theme", "--font-mono")).toMatch(/^"IBM Plex Mono"/);
    expect(fontFamilies?.map((family) => family.name)).toEqual(["Atkinson Hyperlegible", "IBM Plex Mono"]);
  });

  // SPECSFY: US-001 FR-002 NFR-002 AC-006
  it("font stacks end in system fonts so a failed web font does not break the layout", () => {
    expect(declared("@theme", "--font-sans")).toMatch(/ui-sans-serif, system-ui, sans-serif$/);
    expect(declared("@theme", "--font-mono")).toMatch(/ui-monospace, monospace$/);
  });

  // SPECSFY: NFR-002 FR-002 FR-008 AC-031
  it("only the declared weights are emitted (Atkinson 400 and 700, Plex Mono 400)", () => {
    const weights = Object.fromEntries((fontFamilies ?? []).map((family) => [family.name, [...family.weights]]));
    expect(weights).toEqual({ "Atkinson Hyperlegible": [400, 700], "IBM Plex Mono": [400] });
  });
});

const NUXT_UI_ICON_KEYS = [
  "arrowDown", "arrowLeft", "arrowRight", "arrowUp", "caution", "check", "chevronDoubleLeft", "chevronDoubleRight", "chevronDown",
  "chevronLeft", "chevronRight", "chevronUp", "close", "copy", "copyCheck", "dark", "drag", "ellipsis", "error", "external", "eye", "eyeOff",
  "file", "folder", "folderOpen", "hash", "info", "light", "loading", "menu", "minus", "panelClose", "panelOpen", "plus", "reload", "search",
  "stop", "star", "success", "system", "tip", "upload", "warning",
];

describe("Icons", () => {
  // SPECSFY: FR-003 US-002 NFR-003 AC-008
  it("overrides the 43 Nuxt UI icon keys with Phosphor duotone icons that exist in @iconify-json/ph", () => {
    const icons = sharedUiConfig.icons as Record<string, string>;
    expect(Object.keys(icons).sort()).toEqual([...NUXT_UI_ICON_KEYS].sort());
    const ph = JSON.parse(readFileSync(require.resolve("@iconify-json/ph/icons.json"), "utf8")).icons as Record<string, unknown>;
    for (const [key, value] of Object.entries(icons)) {
      expect(value, key).toMatch(/^i-ph-[a-z0-9-]+-duotone$/);
      expect(ph[value.replace(/^i-ph-/, "")], `${key} -> ${value}`).toBeDefined();
    }
  });
});

describe("Radius, density, motion, focus and component adjustments", () => {
  // SPECSFY: US-001 FR-004 AC-010
  it("declares the Serelius scale and the table has no uppercase header", () => {
    const expected: Record<string, string> = {
      "--sr-radius-none": "0", "--sr-radius-xs": "2px", "--sr-radius-sm": "3px", "--sr-radius-md": "3px", "--sr-radius-lg": "3px",
      "--sr-density-row-h": "56px", "--sr-density-gap": "24px", "--sr-density-pad-x": "20px", "--sr-density-pad-y": "16px", "--sr-control-h": "36px",
    };
    for (const [name, value] of Object.entries(expected)) expect(resolve(name, "@theme") ?? resolve(name, ":root"), name).toBe(value);
    expect(enterpriseTableUi.th).not.toMatch(/uppercase|tracking-wider/);
    // D-F2-8: no corner above 3px, in the Serelius scale or in the Tailwind and Nuxt UI scale.
    const radii = [...css.matchAll(/^\s*(--(?:sr-)?radius-[\w-]+|--ui-radius):\s*([^;]+);/gm)].map((m) => ({ name: m[1]!, value: m[2]!.trim() }));
    expect(radii.length).toBeGreaterThanOrEqual(12);
    for (const { name, value } of radii) {
      const px = value.endsWith("rem") ? parseFloat(value) * 16 : parseFloat(value);
      expect(px, `${name}: ${value}`).toBeLessThanOrEqual(3);
    }
  });

  // SPECSFY: FR-004 US-001 NFR-003 AC-011
  it("keeps the collapsed-menu centering fixes that correct behavior", () => {
    const slots = JSON.stringify(sharedUiConfig.dashboardSidebar);
    expect(slots).toContain("group-data-[collapsed=true]:px-0");
    expect(slots).toContain("flex-col items-stretch");
    expect(JSON.stringify(sharedUiConfig.navigationMenu)).toContain("mx-auto");
  });

  // SPECSFY: FR-004 NFR-001 US-001 AC-012
  it("zeroes motion durations under prefers-reduced-motion and draws a visible focus ring from tokens", () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    for (const speed of ["fast", "base", "slow", "spring"]) expect(reduced, speed).toMatch(new RegExp(`--sr-motion-${speed}-duration:\\s*0ms`));
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;}]*var\(--sr-focus-ring-width\)[^;}]*var\(--sr-focus-ring-color\)/);
    expect(resolve("--sr-focus-ring-color", ":root")).toBe(FIRE_500);
    expect(resolve("--sr-focus-ring-color", ".dark")).toBe(FIRE_300);
  });
});

describe("E-mail colors", () => {
  // SPECSFY: US-002 FR-001 FR-007 AC-035
  it("emailColors equal the resolved values of theme.css, so e-mails cannot drift from the tokens", () => {
    expect(emailColors.canvas).toBe(resolve("--ui-bg", ":root"));
    expect(emailColors.ink).toBe(resolve("--ui-text-highlighted", ":root"));
    expect(emailColors.muted).toBe(resolve("--ui-text-muted", ":root"));
    expect(emailColors.line).toBe(resolve("--ui-border", ":root"));
    expect(emailColors.action).toBe(resolve("--ui-primary", ":root"));
    expect(emailColors.onAction).toBe(resolve("--ui-text-inverted", ":root"));
    expect(emailRadius).toBe(resolve("--radius-md", "@theme"));
  });
});
