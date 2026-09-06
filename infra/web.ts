import { webUrl, appUrl, webDomain } from "./dns";
import { deployWorker } from "./utils/nuxt";

await deployWorker("Web", {
  root: "packages/web",
  domain: webDomain,
  vars: {
    NUXT_PUBLIC_APP_URL: appUrl.properties.value,
    // read directly in nuxt.config.ts at build time (not a runtimeConfig
    // entry) since @nuxtjs/seo's `site.url` is evaluated at build time
    SITE_URL: webUrl.properties.value,
  },
});

export const outputs = {
  Web: webUrl.properties.value,
};
