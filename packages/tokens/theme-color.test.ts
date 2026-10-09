import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { themeColor } from "./index";

const css = readFileSync(join(import.meta.dirname, "theme.css"), "utf8");

// The `--ui-bg` declared in the block that opens with `selector` (`:root` or `.dark`).
function uiBg(selector: ":root" | ".dark"): string {
  const block = new RegExp(`^${selector.replace(".", "\\.")} \\{([\\s\\S]*?)\\n\\}`, "m").exec(css)?.[1];
  const value = block && /^\s*--ui-bg:\s*([^;]+);/m.exec(block)?.[1]?.trim();
  if (!value) throw new Error(`--ui-bg not found in ${selector} of theme.css`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  if (!ref) return value.toLowerCase();
  const resolved = new RegExp(`${ref}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)?.[1];
  if (!resolved) throw new Error(`${ref} not found in theme.css`);
  return resolved.toLowerCase();
}

describe("themeColor", () => {
  it("equals the canvas (--ui-bg) of the light mode", () => {
    expect(themeColor.light).toBe(uiBg(":root"));
  });

  it("equals the canvas (--ui-bg) of the dark mode", () => {
    expect(themeColor.dark).toBe(uiBg(".dark"));
  });
});
