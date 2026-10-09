import type { LayerNavigationItem, LayerTeamSettingsTab } from "@nuxfire/manifest";
import { layerManifests } from "./.composition/layer-navigation";

/**
 * Sidebar entries declared by the active Nuxt layers, in `order`.
 *
 * The manifests come from a generated file (see `scripts/compose-layers.ts`),
 * regenerated on every Nuxt config load — the same mechanism that composes the
 * tRPC routers, so navigation can never drift from what is on disk either.
 *
 * `to` still contains the `{team}` placeholder: substituting the active tenant
 * slug is the caller's job (see `layouts/dashboard.vue`), because a layer
 * manifest is static build-time data and has no idea which team is open.
 */
export function useLayerNavigation() {
  return computed<LayerNavigationItem[]>(() =>
    layerManifests
      .flatMap((manifest) => manifest.navigation?.sidebar ?? [])
      .slice()
      .sort((a, b) => a.order - b.order),
  );
}

/**
 * Team-settings tabs declared by the active Nuxt layers (SPEC-0005). Lives
 * here, next to `useLayerNavigation`, rather than as an explicit import from
 * `layers/teams` into `.composition/layer-navigation.ts`: this file sits in
 * `apps/app`, which Nuxt auto-imports for every extended layer, so
 * `useTeamSettingsLinks` (owned by `layers/teams`, a base layer) consumes it
 * without importing anything from the feature layer that contributed a tab.
 */
export function useLayerTeamSettingsTabs() {
  return layerManifests.flatMap(
    (manifest): LayerTeamSettingsTab[] => manifest.teamSettingsTabs ?? [],
  );
}
