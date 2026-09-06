import type { BadgeProps } from "@nuxt/ui";

/**
 * `Plan.tier` is a free-form text column — the admin UI can create a plan with
 * any tier at all — so the badge colour comes from an explicit map of the
 * tiers the app actually ships, never from the string itself. Anything else
 * reads as neutral instead of being coloured by accident.
 */
const PLAN_TIER_COLORS = {
  FREE: "neutral",
  PRO: "primary",
} as const;

export const planTierColor = (tier: string): BadgeProps["color"] =>
  PLAN_TIER_COLORS[tier as keyof typeof PLAN_TIER_COLORS] ?? "neutral";
