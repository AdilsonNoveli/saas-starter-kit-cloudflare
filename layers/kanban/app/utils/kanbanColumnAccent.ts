/**
 * Deterministic per-column accent, keyed by column position, taken from the semantic colors of the
 * design tokens (no fixed hex). Mixed against
 * theme CSS variables (`--ui-bg-muted`, `--ui-border`, `--ui-text`) rather
 * than fixed hex endpoints, so the result stays correct in both light and
 * dark mode with zero JS color-mode branching — the browser re-resolves the
 * `color-mix()` whenever `.dark` flips those variables.
 */
const KANBAN_COLUMN_ACCENTS = [
  "var(--ui-info)",
  "var(--ui-success)",
  "var(--ui-warning)",
  "var(--ui-error)",
  "var(--ui-primary)",
  "var(--ui-secondary)",
  "var(--ui-text-muted)",
  "var(--ui-border-accented)",
] as const;

export function kanbanColumnAccentStyle(position: number | undefined) {
  const accent =
    KANBAN_COLUMN_ACCENTS[(position ?? 0) % KANBAN_COLUMN_ACCENTS.length] ??
    "var(--ui-text-muted)";

  return {
    backgroundColor: `color-mix(in srgb, ${accent} 32%, var(--ui-bg-muted))`,
    borderColor: `color-mix(in srgb, ${accent} 55%, var(--ui-border))`,
    color: `color-mix(in srgb, ${accent} 65%, var(--ui-text))`,
  };
}
