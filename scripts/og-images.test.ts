import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generateOgImages, OG_HEIGHT, OG_WIDTH, pngPathFor, pngSize, planOgImages } from "./og-images";

// BDD source: specs/*/0001-content-seo-metadata/spec.md (AC-007, and the guards of NFR-002).

const ROOT = join(import.meta.dirname, "..");
const WEB = join(ROOT, "apps/web");
const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** Shapes only: text would make the fixture depend on the fonts of the machine. */
const svg = (viewBox = "0 0 800 450"): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect width="100%" height="100%" fill="#0f172a"/><circle cx="400" cy="225" r="80" fill="#10b981"/></svg>`;

function publicDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "og-images-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const file = join(dir, name);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  return dir;
}

const sha = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");

describe("planning the images to generate (AC-007)", () => {
  // SPECSFY: US-002 FR-009 AC-007
  it("maps every SVG to a PNG next to it", () => {
    expect(pngPathFor("/x/public/images/blog/cover.svg")).toBe("/x/public/images/blog/cover.png");
    expect(pngPathFor("C:\\x\\cover.SVG")).toBe("C:\\x\\cover.png");
  });

  // SPECSFY: US-002 FR-009 AC-007
  it("refuses a source that is not an SVG", () => {
    expect(() => pngPathFor("/x/cover.png")).toThrow(/svg/i);
  });

  // SPECSFY: US-002 FR-009 AC-007
  it("plans the blog covers and the default image and ignores everything else", () => {
    const dir = publicDir({
      "images/blog/a.svg": svg(),
      "images/blog/b.svg": svg(),
      "images/blog/notes.txt": "x",
      "images/og/default.svg": svg(),
      "images/docs/diagram.svg": svg(),
      "svg/logo.svg": svg(),
    });
    const plan = planOgImages(dir).map((item) => relative(dir, item.svg).replaceAll("\\", "/"));
    expect(plan).toEqual(["images/blog/a.svg", "images/blog/b.svg", "images/og/default.svg"]);
  });
});

// `sharp` loads a native binary and renders real images: allow for a loaded machine.
describe("generating the images (AC-007)", { timeout: 30_000 }, () => {
  // SPECSFY: US-002 FR-002 FR-009 AC-007
  it("renders a PNG of exactly 1200 by 675 pixels from a 16:9 SVG", async () => {
    const dir = publicDir({ "images/blog/a.svg": svg() });
    await generateOgImages(dir);
    const size = pngSize(readFileSync(join(dir, "images/blog/a.png")));
    expect(size).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
    expect([OG_WIDTH, OG_HEIGHT]).toEqual([1200, 675]);
  });

  // SPECSFY: US-002 FR-009 AC-007
  it("changes no byte when it runs a second time", async () => {
    const dir = publicDir({ "images/blog/a.svg": svg(), "images/og/default.svg": svg() });
    await generateOgImages(dir);
    const first = [sha(join(dir, "images/blog/a.png")), sha(join(dir, "images/og/default.png"))];
    await generateOgImages(dir);
    const second = [sha(join(dir, "images/blog/a.png")), sha(join(dir, "images/og/default.png"))];
    expect(second).toEqual(first);
  });

  // SPECSFY: US-002 FR-009 AC-007
  it("never touches the SVG source", async () => {
    const dir = publicDir({ "images/blog/a.svg": svg() });
    const before = sha(join(dir, "images/blog/a.svg"));
    await generateOgImages(dir);
    expect(sha(join(dir, "images/blog/a.svg"))).toBe(before);
  });

  // SPECSFY: US-002 FR-002 FR-009 AC-007
  it("refuses an SVG that is not 16:9 instead of stretching or cropping it", async () => {
    const dir = publicDir({ "images/blog/square.svg": svg("0 0 400 400") });
    await expect(generateOgImages(dir)).rejects.toThrow(/square\.svg.*16:9/s);
  });

  // SPECSFY: US-002 FR-002 FR-009 AC-007
  it("reports which files it wrote", async () => {
    const dir = publicDir({ "images/blog/a.svg": svg() });
    const { written } = await generateOgImages(dir);
    expect(written.map((file) => relative(dir, file).replaceAll("\\", "/"))).toEqual(["images/blog/a.png"]);
  });
});

describe("the images committed in the repository (AC-007)", () => {
  const pub = join(WEB, "public");

  // SPECSFY: US-002 FR-002 FR-009 AC-007
  it("has a 1200 by 675 PNG for every cover and for the default image", () => {
    const plan = planOgImages(pub);
    expect(plan.length).toBeGreaterThan(1);
    for (const { svg: source, png } of plan) {
      expect(statSync(png, { throwIfNoEntry: false })?.isFile(), `${png} is missing (run generate:og)`).toBe(true);
      expect(pngSize(readFileSync(png)), `${png} has the wrong size`).toEqual({
        width: OG_WIDTH,
        height: OG_HEIGHT,
      });
      expect(source.endsWith(".svg")).toBe(true);
    }
  });

  // SPECSFY: US-002 FR-009 AC-007
  it("includes the default site image", () => {
    const planned = planOgImages(pub).map((item) => relative(pub, item.png).replaceAll("\\", "/"));
    expect(planned).toContain("images/og/default.png");
  });
});

describe("the tooling adds no runtime dependency (NFR-002)", () => {
  const manifest = (file: string) =>
    JSON.parse(readFileSync(file, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return ["node_modules", ".nuxt", ".output", ".data", "dist", "public", "content"].includes(entry.name)
          ? []
          : walk(path);
      }
      return /\.(ts|vue|mts)$/.test(entry.name) ? [path] : [];
    });

  // SPECSFY: NFR-002 FR-009 US-002 AC-007
  it("declares sharp as an exact root devDependency and nowhere else", () => {
    const root = manifest(join(ROOT, "package.json"));
    expect(root.devDependencies?.sharp).toMatch(/^\d+\.\d+\.\d+$/);
    expect(root.dependencies?.sharp).toBeUndefined();
    const web = manifest(join(WEB, "package.json"));
    expect({ ...web.dependencies, ...web.devDependencies }).not.toHaveProperty("sharp");
  });

  // SPECSFY: NFR-002 FR-009 US-002 AC-007
  it("keeps sharp out of the web application sources", () => {
    const offenders = walk(WEB).filter((file) => /from\s+["']sharp["']|require\(["']sharp["']\)|import\(["']sharp["']\)/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  // SPECSFY: NFR-002 FR-009 US-002 AC-005 AC-007
  it("loads sharp lazily so that reading a PNG header never needs it", () => {
    const source = readFileSync(join(import.meta.dirname, "og-images.ts"), "utf8");
    expect(source).not.toMatch(/^import[^;]*from\s+["']sharp["']/m);
    expect(source).toMatch(/import\(["']sharp["']\)/);
  });
});
