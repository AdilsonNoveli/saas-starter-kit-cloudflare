export default defineAppConfig({
  ui: {
    colors: {
      primary: "orange",
      neutral: "stone",
    },
  },
  site: {
    url: "https://app.nuxfire.com",
    name: "NuxFire",
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
  },
  docs: {
    name: "Docs",
    description: "NuxFire Documentation",
    sidebar: {
      useLevel: false,
      collapse: false,
      collapseLevel: 1,
      folderStyle: "default",
    },
  },
});
