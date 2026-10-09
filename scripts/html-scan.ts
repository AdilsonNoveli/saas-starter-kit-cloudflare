// Small, dependency-free helpers to read the tags of a built HTML page. They are shared by the
// gates (seo-rules, perf-rules) so that a quoted `>` inside an attribute value, for example
// `content="specs/<state>"`, is read the same way everywhere.

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

export const decode = (text: string): string =>
  text.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity);

/** The inside of a tag: a quoted attribute value may contain `>`. */
const TAG_BODY = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`;

/** Matches every opening tag named `name` (`<meta ...>`), quoted values included. */
export const tagPattern = (name: string): RegExp => new RegExp(String.raw`<${name}\b${TAG_BODY}>`, "gi");

/** The double-quoted attributes of one tag, lower-cased names, decoded values. */
export function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*"([^"]*)"/g)) {
    found[match[1].toLowerCase()] = decode(match[2]);
  }
  return found;
}
