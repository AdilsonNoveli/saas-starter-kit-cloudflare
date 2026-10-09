// SPEC-0008 (Fase 2): compares the screen files of the repository with the visual review board
// recorded in the spec (decision D-F2-5): every page and layout must be reviewed in the light theme,
// the dark theme and a phone width, with a date.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface ReviewRow {
  screen: string;
  light: string;
  dark: string;
  phone: string;
  date: string;
}

const SKIPPED = new Set(["node_modules", ".nuxt", ".output", "dist"]);
const SPEC_STATES = ["defined", "planned", "in-progress", "review", "completed"];

function vueFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (SKIPPED.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return vueFiles(path);
    return name.endsWith(".vue") ? [path] : [];
  });
}

/** Every `pages/` and `layouts/` `.vue` file of `apps/*` and `layers/*`, repository-relative. */
export function listScreens(root: string): string[] {
  const screens: string[] = [];
  for (const scope of ["apps", "layers"]) {
    const base = join(root, scope);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base)) {
      for (const folder of ["pages", "layouts"]) {
        for (const file of vueFiles(join(base, name, "app", folder))) screens.push(relative(root, file).replaceAll("\\", "/"));
      }
    }
  }
  return screens.sort();
}

/** Rows of the review board found in the spec, whichever state folder it is in. */
export function readReviewBoard(root: string): ReviewRow[] {
  const state = SPEC_STATES.find((s) => existsSync(join(root, `specs/${s}/0008-fase-2-design-system-serelius/spec.md`)));
  if (!state) return [];
  const text = readFileSync(join(root, `specs/${state}/0008-fase-2-design-system-serelius/spec.md`), "utf8");
  const start = text.indexOf("#### Quadro de revisão visual");
  if (start === -1) return [];
  const rows: ReviewRow[] = [];
  for (const line of text.slice(start).split(/\r?\n/).slice(1)) {
    if (/^#{1,4} /.test(line)) break;
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim().replaceAll("`", ""));
    if (cells.length < 5 || !cells[0].endsWith(".vue")) continue;
    rows.push({ screen: cells[0], light: cells[1], dark: cells[2], phone: cells[3], date: cells[4] });
  }
  return rows;
}

const verified = (row: ReviewRow): boolean => [row.light, row.dark, row.phone].every((cell) => cell === "OK") && /^\d{4}-\d{2}-\d{2}$/.test(row.date);

/** Screens without a row, rows without a screen, and screens not fully verified (a missing row counts). */
export function compareBoard(screens: string[], rows: ReviewRow[]): { missing: string[]; unknown: string[]; unverified: string[] } {
  const known = new Set(screens);
  const byScreen = new Map(rows.map((row) => [row.screen, row]));
  return {
    missing: screens.filter((screen) => !byScreen.has(screen)),
    unknown: rows.map((row) => row.screen).filter((screen) => !known.has(screen)),
    unverified: screens.filter((screen) => !byScreen.has(screen) || !verified(byScreen.get(screen)!)),
  };
}
