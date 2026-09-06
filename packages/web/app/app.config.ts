export default defineAppConfig({
  ui: {
    colors: {
      primary: "orange",
      neutral: "zinc",
    },
  },

  site: {
    url: "https://nuxfire.com",
    name: "NuxFire",
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
  },
  docs: {
    name: "NuxFire Docs",
    description: "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.",
    sidebar: {
      useLevel: true,
      collapse: false,
      collapseLevel: 1,
      folderStyle: "default",
    },
  },
});

