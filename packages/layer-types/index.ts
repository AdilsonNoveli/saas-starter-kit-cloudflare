/**
 * Shared contract for a Nuxt feature layer's `layer.manifest.ts`.
 *
 * There is deliberately no `infrastructure` field: Cloudflare resources are
 * provisioned only by the `flags` object in the root `config.ts`, read directly
 * by `infra/*.ts`. A manifest field describing infrastructure would have no
 * code reading it. See "Registro de Decisões da Auditoria" in
 * `_docs/REFATORE_ARCHITETURE.md`.
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
  /** Permission strings this layer adds to the RBAC catalogue, `layer:resource:action`. */
  permissions?: string[];
}

/** Identity helper that gives a layer manifest its type without widening it. */
export function defineLayerManifest<T extends LayerManifest>(manifest: T): T {
  return manifest;
}
