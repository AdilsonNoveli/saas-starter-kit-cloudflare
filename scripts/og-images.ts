import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Social images (Open Graph / Twitter) are raster: Facebook lists JPEG, GIF and PNG for
// og:image and SVG is not among them. The covers are designed as SVG, so this module
// renders each one to a PNG next to it. It runs at build time on the maintainer's
// machine (`bun run generate:og`); the PNGs are committed. `sharp` is a root
// devDependency and is loaded lazily, so reading a PNG header (used by the SEO gate)
// never needs it and it can never reach the Worker bundle.

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 675;

export interface OgImagePlan {
  svg: string;
  png: string;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from the IHDR chunk of a PNG, or undefined when it is not a PNG. */
export function pngSize(buffer: Uint8Array): { width: number; height: number } | undefined {
  if (buffer.length < 24) return undefined;
  if (PNG_SIGNATURE.some((byte, index) => buffer[index] !== byte)) return undefined;
  const chunk = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
  if (chunk !== "IHDR") return undefined;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function pngPathFor(svgPath: string): string {
  if (!/\.svg$/i.test(svgPath)) throw new Error(`Not an SVG source: ${svgPath}`);
  return svgPath.replace(/\.svg$/i, ".png");
}

/** The blog covers and the default site image found under `<publicDir>/images`. */
export function planOgImages(publicDir: string): OgImagePlan[] {
  const sources: string[] = [];
  const blog = join(publicDir, "images", "blog");
  if (existsSync(blog)) {
    for (const name of readdirSync(blog).sort()) {
      if (/\.svg$/i.test(name)) sources.push(join(blog, name));
    }
  }
  const fallback = join(publicDir, "images", "og", "default.svg");
  if (existsSync(fallback)) sources.push(fallback);
  return sources.map((svg) => ({ svg, png: pngPathFor(svg) }));
}

/**
 * Renders every planned SVG to a 1200x675 PNG. An SVG that is not 16:9 is refused: it
 * would have to be stretched or cropped, and that decision belongs to the designer.
 * A PNG that is already identical is left untouched, so a second run changes nothing.
 */
export async function generateOgImages(publicDir: string): Promise<{ written: string[] }> {
  const { default: sharp } = await import("sharp");
  const written: string[] = [];
  for (const { svg, png } of planOgImages(publicDir)) {
    const source = readFileSync(svg);
    const { width, height } = await sharp(source).metadata();
    if (!width || !height || Math.abs(width / height - OG_WIDTH / OG_HEIGHT) > 0.01) {
      throw new Error(`${svg} is ${width}x${height}: social images must be 16:9 (${OG_WIDTH}x${OG_HEIGHT})`);
    }
    const output = await sharp(source, { density: (72 * OG_WIDTH) / width })
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const current = existsSync(png) ? readFileSync(png) : undefined;
    if (!current || !current.equals(output)) {
      writeFileSync(png, output);
      written.push(png);
    }
  }
  return { written };
}
