// `@nuxfire/tokens` is also a Nuxt layer, extended by apps/web, apps/app and apps/login, for two things:
// - `public/`: the brand files (symbol, logos, favicon, PWA icons) live here once and every app
//   serves them from its own root, so no app keeps a copy of the brand;
// - `app/components/`: the visual controls both apps draw the same way (`ColorModeSwitch`,
//   `LocaleSwitch`, SPEC-0010 DEC-004, used by apps/web and apps/app), auto-registered without a
//   prefix because Nuxt reads a layer's `app/` as its source directory; each app passes its own
//   labels and behavior by props.
// The design tokens themselves stay plain CSS/TS imports.
export default {};
