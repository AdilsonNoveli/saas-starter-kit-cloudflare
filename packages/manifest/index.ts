/**
 * Shared contract for a Nuxt feature layer's `layer.manifest.ts`.
 *
 * There is deliberately no `infrastructure` field: Cloudflare resources are
 * provisioned only by the `flags` object in the root `config.ts`, read directly
 * by `infra/*.ts`. A manifest field describing infrastructure would have no
 * code reading it. See `nuxfire-layers.md`.
 */

/** A single item a layer injects into the application sidebar. */
export interface LayerNavigationItem {
  label: string;
  /** Icon name, e.g. `i-lucide-kanban`. */
  icon: string;
  /** Route, `{team}` being substituted with the active tenant slug. */
  to: string;
  /** Sort key across all layers; lower comes first. */
  order: number;
}

export interface LayerNavigation {
  sidebar?: LayerNavigationItem[];
}

/**
 * A tab a layer injects into the per-team settings page
 * (`layers/teams/app/pages/[[team]]/settings.vue`). Unlike the sidebar, a
 * settings tab is visibility-gated per team/user, so it carries the
 * permission string to check — the generic `teamsHasPermission` ability
 * (`layers/teams/shared/utils/abilities.ts`) checks it without either side
 * importing the other (SPEC-0005: base layers never import a feature layer).
 */
export interface LayerTeamSettingsTab {
  label: string;
  icon: string;
  /** Route suffix appended to the team's settings base route, e.g. `/settings/billing`. */
  to: string;
  /** Permission string gating visibility, e.g. `teams:billing:view`. */
  permission: string;
  /** Sort key across all layers; lower comes first. */
  order: number;
}

export interface LayerManifest {
  /** Layer id — matches the `layers/<name>/` folder and the `@nuxfire/layer-<name>` package. */
  name: string;
  displayName: string;
  description: string;
  version: string;
  /**
   * Other layers this one depends on. Documentational only: nothing validates
   * the `extends` order automatically.
   */
  requires?: string[];
  navigation?: LayerNavigation;
  teamSettingsTabs?: LayerTeamSettingsTab[];
  /** Permission strings this layer adds to the RBAC catalogue, `layer:resource:action`. */
  permissions?: string[];
}

/** Identity helper that gives a layer manifest its type without widening it. */
export function defineLayerManifest<T extends LayerManifest>(manifest: T): T {
  return manifest;
}
