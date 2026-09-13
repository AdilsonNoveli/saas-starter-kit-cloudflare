import type { LayerNavigationItem } from "@nuxfire/layer-types";
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
