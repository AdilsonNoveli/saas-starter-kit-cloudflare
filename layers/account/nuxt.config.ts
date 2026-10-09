export default defineNuxtConfig({
  $meta: {
    name: "account",
  },
  components: [
    {
      // Relative to `srcDir` (`layers/account/app`). No `prefix`: the tag comes
      // from the folder plus the file name, so keeping `account/`, `avatar/` and
      // `settings/` nested preserves `<AccountUserDropdown>`,
      // `<AccountMfaSetupModal>`, `<AvatarUploader>` and `<SettingsPanel>`, the
      // names other layers already render.
      path: "./components",
    },
  ],
  // The layer's own text lives in `i18n/locales/`. Without this block the
  // module never reads those files and every key renders raw. Same codes and
  // file names as `apps/app/nuxt.config.ts`, which they merge into.
  i18n: {
    locales: [
      { code: "en", language: "en-US", file: "en.json" },
      { code: "pt-br", language: "pt-BR", file: "pt-BR.json" },
      { code: "es", language: "es-ES", file: "es.json" },
    ],
  },
});
