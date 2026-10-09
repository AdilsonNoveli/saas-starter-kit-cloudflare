// Derives the PWA and touch icons from the Serelius symbol into `packages/tokens/public/`, the only
// place the brand lives. Run it after the symbol or the palette changes:
//   bun scripts/generate-brand-icons.ts
// Colors are read from `packages/tokens/theme.css`, so the icons follow the tokens.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = join(import.meta.dirname, "..");
const tokens = join(root, "packages/tokens");
const css = readFileSync(join(tokens, "theme.css"), "utf8");
const color = (name: string): string => {
  const value = new RegExp(`${name}: *(#[0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!value) throw new Error(`${name} not found in theme.css`);
  return value;
};
const ink = color("--color-serelius-500");
const symbol = readFileSync(join(tokens, "public/icon-color.svg"));

/** The symbol scaled to `size * scale`, centered on a square canvas of `size` with an optional background. */
async function icon(size: number, scale: number, background?: string): Promise<Buffer> {
  const inner = Math.round(size * scale);
  const glyph = await sharp(symbol, { density: 384 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: glyph, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const outputs: [string, number, number, string | undefined][] = [
  ["pwa-64x64.png", 64, 1, undefined],
  ["pwa-192x192.png", 192, 1, undefined],
  ["pwa-512x512.png", 512, 1, undefined],
  // Maskable icons keep the symbol inside the central 80% safe zone, on a solid ink background.
  ["maskable-icon-512x512.png", 512, 0.6, ink],
  // Apple draws no transparency under a touch icon, so it also gets the solid ink background.
  ["apple-touch-icon-180x180.png", 180, 0.7, ink],
];
for (const [name, size, scale, background] of outputs) {
  writeFileSync(join(tokens, "public", name), await icon(size, scale, background));
  console.log(`${name} (${size}x${size})`);
}
