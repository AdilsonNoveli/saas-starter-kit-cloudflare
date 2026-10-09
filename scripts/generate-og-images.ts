// Renders the SVG covers and the default site image under apps/web/public/images to the
// 1200x675 PNGs that social networks read. Usage: `bun run generate:og [publicDir]`.
// The PNGs are committed; run this after adding or changing a cover.
import { join, relative } from "node:path";
import { generateOgImages } from "./og-images";

const root = join(import.meta.dir, "..");
const publicDir = process.argv[2] ?? join(root, "apps/web/public");

const { written } = await generateOgImages(publicDir);
if (written.length === 0) {
  console.log("All social images are up to date.");
} else {
  console.log(`Wrote ${written.length} social image(s):`);
  for (const file of written) console.log(`  ${relative(root, file).replaceAll("\\", "/")}`);
}
