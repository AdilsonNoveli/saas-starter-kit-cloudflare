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
