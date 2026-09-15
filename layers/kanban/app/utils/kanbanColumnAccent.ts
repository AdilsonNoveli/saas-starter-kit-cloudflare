/**
 * Deterministic per-column accent, keyed by column position. Mixed against
 * theme CSS variables (`--ui-bg-muted`, `--ui-border`, `--ui-text`) rather
 * than fixed hex endpoints, so the result stays correct in both light and
 * dark mode with zero JS color-mode branching — the browser re-resolves the
 * `color-mix()` whenever `.dark` flips those variables.
 */
const KANBAN_COLUMN_ACCENTS = [
  "#EC4899",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#EF4444",
  "#6B7280",
] as const;

export function kanbanColumnAccentStyle(position: number | undefined) {
  const accent =
    KANBAN_COLUMN_ACCENTS[(position ?? 0) % KANBAN_COLUMN_ACCENTS.length] ??
    "#6B7280";

  return {
    backgroundColor: `color-mix(in srgb, ${accent} 32%, var(--ui-bg-muted))`,
    borderColor: `color-mix(in srgb, ${accent} 55%, var(--ui-border))`,
    color: `color-mix(in srgb, ${accent} 65%, var(--ui-text))`,
  };
}
