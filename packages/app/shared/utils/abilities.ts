// TEMPORARY BRIDGE — delete in Fase 3, passo 1b (the frontend half of the
// teams extraction). Nothing new may be added to this file.
//
// The real definitions moved to layers/teams/shared/utils/abilities.ts. Five
// files under packages/app/app/ still import them by the `#shared/utils/
// abilities` specifier, and `#shared` resolves to THIS package's own `shared/`
// directory only (Nuxt aliases `#shared` to `<rootDir>/shared`; a layer's
// `shared/` is auto-imported across layers but never reachable through that
// alias). Those five files are out of scope for the backend half of the
// extraction, so this re-export keeps their specifier resolving instead of
// leaving the app typecheck red — which would have buried any real error in
// the router/schema rewiring this step is supposed to prove correct.
//
//   packages/app/app/composables/use-ability.ts
//   packages/app/app/components/members/MembersListItem.vue
//   packages/app/app/components/members/InvitesListItem.vue
//   packages/app/app/pages/[[team]]/settings/members.vue
//   packages/app/app/pages/[[team]]/settings/security.vue
//
// When those move into the layer, delete this file. Note that these names are
// therefore registered twice in Nuxt's auto-import namespace (once from the
// layer, once from here). It is harmless only because a re-export is the very
// same binding — two `defineAbility()` calls would not be — and it is the
// second reason this file is temporary.
export * from "@nuxfire/layer-teams/shared/utils/abilities";
