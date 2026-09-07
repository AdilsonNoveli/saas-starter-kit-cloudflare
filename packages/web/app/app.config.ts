export default defineAppConfig({
  ui: {
    colors: {
      primary: "flame",
      secondary: "fire",
      success: "green",
      info: "blue",
      warning: "amber",
      error: "red",
      neutral: "night",
    },
    button: {
      defaultVariants: {
        color: "primary",
        variant: "solid",
      },
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

