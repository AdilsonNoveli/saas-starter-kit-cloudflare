import { sharedUiConfig } from "@nuxfire/tokens";
import { prodDomain } from "../../../config";

export default defineAppConfig({
  ui: {
    ...sharedUiConfig,
  },
  site: {
    url: `https://app.${prodDomain}`,
    name: "Nuxfire",
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
  },
  docs: {
    name: "Docs",
    description: "Nuxfire Documentation",
    sidebar: {
      useLevel: false,
      collapse: false,
      collapseLevel: 1,
      folderStyle: "default",
    },
  },
});
