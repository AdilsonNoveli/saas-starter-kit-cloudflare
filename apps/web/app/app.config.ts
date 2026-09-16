import { sharedUiConfig } from "@nuxfire/tokens";

export default defineAppConfig({
  ui: {
    ...sharedUiConfig,
  },

  site: {
    url: "https://nuxfire.com",
    name: "Nuxfire",
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
  },
  docs: {
    name: "Nuxfire Docs",
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
    sidebar: {
      useLevel: true,
      collapse: false,
      collapseLevel: 1,
      folderStyle: "default",
    },
  },
});

