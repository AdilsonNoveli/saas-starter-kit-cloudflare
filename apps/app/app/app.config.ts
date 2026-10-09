import { sharedUiConfig } from "@nuxfire/tokens";

export default defineAppConfig({
  ui: {
    ...sharedUiConfig,
  },
  site: {
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
  },
});
