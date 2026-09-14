export default defineI18nConfig(() => ({
  legacy: false,
  locale: "en",
  messages: {
    en: {
      welcome: "Welcome to the dashboard!",
    },
    fr: {
      welcome: "Bienvenue sur le tableau de bord !",
    },
  },
}));
