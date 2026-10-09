import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Violation } from "./seo-rules";

// Explicit, dated, owned exceptions to a gate (SPEC-0002 DEC-008, NFR-002).
//
// A gate that starts red and is waived is not accepted; a gate that lists what is known to be
// wrong, who removes it and since when, and refuses anything new, is. An allowance names one
// rule, one place and (optionally) the text of the message it covers. It has three duties:
//   - it must name the spec (or backlog item) that removes the defect;
//   - it must still match something: an allowance that matches nothing is stale and fails,
//     so the list can only shrink;
//   - it never widens: a violation that no allowance names still fails.

export interface Allowance {
  /** Rule id of the violation it covers, for example `img-max-bytes`. */
  rule: string;
  /** The `where` of the violation (a page, a file, a locale key). */
  where: string;
  /** When present: equal to the `subject` of the violation, or contained in its message when it has none. */
  match?: string;
  /** `SPEC-0003` or `BACKLOG-app-ui-copy`: what removes the defect. */
  removedBy: string;
  /** `YYYY-MM-DD`, the day the defect was recorded. */
  since: string;
}

const OWNER = /^(?:SPEC-\d{4}|BACKLOG-[A-Za-z0-9-]+)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidOwner(value: unknown): value is string {
  return typeof value === "string" && OWNER.test(value);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/**
 * Removes the violations the allowances name. `problems` holds the allowances that are
 * invalid (`allowance-owner`) or that matched nothing (`allowance-stale`).
 */
export function applyAllowances(
  violations: readonly Violation[],
  allowances: readonly Allowance[],
): { remaining: Violation[]; problems: Violation[] } {
  const problems: Violation[] = [];
  const used = new Set<number>();
  const remaining = violations.filter((violation) => {
    const index = allowances.findIndex(
      (allowance) =>
        allowance.rule === violation.rule &&
        allowance.where === violation.where &&
        (allowance.match === undefined ||
          (violation.subject !== undefined ? violation.subject === allowance.match : violation.message.includes(allowance.match))),
    );
    if (index === -1) return true;
    used.add(index);
    return false;
  });

  allowances.forEach((allowance, index) => {
    const label = `${allowance.rule} ${allowance.where}${allowance.match ? ` "${allowance.match}"` : ""}`;
    if (!isValidOwner(allowance.removedBy) || !isIsoDate(allowance.since)) {
      problems.push({
        rule: "allowance-owner",
        where: allowance.where,
        message: `the allowance for ${label} needs removedBy (SPEC-nnnn or BACKLOG-name) and since (YYYY-MM-DD)`,
      });
    }
    if (!used.has(index)) {
      problems.push({
        rule: "allowance-stale",
        where: allowance.where,
        message: `the allowance for ${label} matches nothing any more: the defect is gone, delete the entry`,
      });
    }
  });
  return { remaining, problems };
}

/**
 * True when the owner is real: `SPEC-0003` needs a folder `specs/<state>/0003-*`, and
 * `BACKLOG-landing-refactor` needs a file `specs/backlog/<number>-landing-refactor.md`. An
 * allowance that names something that does not exist is not owned by anyone.
 */
export function ownerExists(owner: string, root: string): boolean {
  if (!isValidOwner(owner)) return false;
  const specs = join(root, "specs");
  if (!existsSync(specs)) return false;
  if (owner.startsWith("SPEC-")) {
    const number = owner.slice("SPEC-".length);
    return readdirSync(specs).some((state) => {
      const dir = join(specs, state);
      try {
        return readdirSync(dir).some((entry) => entry.startsWith(`${number}-`));
      } catch {
        return false;
      }
    });
  }
  const slug = owner.slice("BACKLOG-".length);
  const backlog = join(specs, "backlog");
  return existsSync(backlog) && readdirSync(backlog).some((file) => new RegExp(String.raw`^\d+-${slug}\.md$`).test(file));
}

/** One `allowance-owner` violation for each allowance whose owner is well formed but does not exist. */
export function missingOwners(allowances: readonly Allowance[], root: string): Violation[] {
  return allowances
    .filter((allowance) => isValidOwner(allowance.removedBy) && !ownerExists(allowance.removedBy, root))
    .map((allowance) => ({
      rule: "allowance-owner",
      where: allowance.where,
      message: `${allowance.removedBy} names no spec (specs/*/nnnn-*) and no backlog item (specs/backlog/*-slug.md): nobody owns the removal of ${allowance.rule} ${allowance.where}`,
    }));
}
