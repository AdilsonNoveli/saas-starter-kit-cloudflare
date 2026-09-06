import type { BadgeProps } from "@nuxt/ui";

/**
 * `Team.status` is a text column, so the badge colour comes from an explicit
 * map of the values the app actually writes — never derived from the string
 * itself. Anything unexpected reads as neutral instead of being coloured
 * green or red by accident.
 */
const TEAM_STATUS_COLORS = {
  ACTIVE: "success",
  SUSPENDED: "error",
} as const;

export const teamStatusColor = (status: string): BadgeProps["color"] =>
  TEAM_STATUS_COLORS[status as keyof typeof TEAM_STATUS_COLORS] ?? "neutral";
