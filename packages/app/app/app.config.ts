export default defineAppConfig({
  ui: {
    colors: {
      primary: "orange",
      neutral: "stone",
    },
  },
  site: {
    url: "https://movimentabairro.com.br",
    name: "Movimenta Bairro",
    description: "Movimenta Bairro — mobilizando o bairro, juntos.",
  },
  docs: {
    name: "Docs",
    description: "Movimenta Bairro Documentation",
    sidebar: {
      useLevel: false,
      collapse: false,
      collapseLevel: 1,
      folderStyle: "default",
    },
  },
});
