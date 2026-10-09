import type { Violation } from "./seo-rules";

// Parser and validator of `apps/web/public/_redirects` (SPEC-0002 FR-007).
//
// Cloudflare Workers Static Assets reads redirect rules from this file (one per line,
// `source destination [status]`) and answers them itself, before an asset is served. The
// default status is 302. Bing Webmaster Guidelines, section 7, ask for 301 for a permanent move
// and accept 302 only for a change of less than two days, so every rule here says 301 or 308.

export interface RedirectEntry {
  from: string;
  to: string;
  status?: number;
  /** 1-based line in the file. */
  line: number;
}

const WHERE = "_redirects";
const problem = (rule: string, line: number, message: string): Violation => ({ rule, where: `${WHERE}:${line}`, message });

export function parseRedirects(text: string): { entries: RedirectEntry[]; problems: Violation[] } {
  const entries: RedirectEntry[] = [];
  const problems: Violation[] = [];
  text.replace(/\r\n/g, "\n").split("\n").forEach((raw, index) => {
    const line = index + 1;
    const content = raw.trim();
    if (content === "" || content.startsWith("#")) return;
    const parts = content.split(/\s+/);
    if (parts.length < 2 || parts.length > 3 || !parts[0].startsWith("/")) {
      problems.push(problem("redirect-syntax", line, `"${content}" is not "/source destination status"`));
      return;
    }
    const status = parts[2] === undefined ? undefined : Number(parts[2]);
    if (parts[2] !== undefined && !Number.isInteger(status)) {
      problems.push(problem("redirect-syntax", line, `"${parts[2]}" is not a status code`));
      return;
    }
    entries.push({ from: parts[0], to: parts[1], status, line });
  });
  return { entries, problems };
}

export function validateRedirects(text: string): Violation[] {
  const { entries, problems } = parseRedirects(text);
  const found = [...problems];
  const sources = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status !== 301 && entry.status !== 308) {
      found.push(problem("redirect-status", entry.line, `${entry.from} answers ${entry.status ?? "302 (the Cloudflare default, no status written)"}: a permanent move must say 301 or 308`));
    }
    if (sources.has(entry.from)) {
      found.push(problem("redirect-duplicate", entry.line, `${entry.from} is already redirected on line ${sources.get(entry.from)}`));
    } else sources.set(entry.from, entry.line);
    if (entry.from === entry.to) found.push(problem("redirect-loop", entry.line, `${entry.from} redirects to itself`));
  }
  for (const entry of entries) {
    if (entry.from !== entry.to && sources.has(entry.to)) {
      found.push(problem("redirect-chain", entry.line, `${entry.to} is itself redirected on line ${sources.get(entry.to)}: point ${entry.from} at the final page`));
    }
  }
  return found;
}
