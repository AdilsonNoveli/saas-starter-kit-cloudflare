import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import es from "./locales/es.json";

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: "en",
  messages: {
    en,
    "pt-br": ptBR,
    es,
  },
}));
