/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "nuxfire",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "cloudflare",
      providers: {
        cloudflare: "6.20.0",
        command: "1.0.1",
        random: "4.17.0",
      },
    };
  },
  async run() {
    const { readdirSync } = await import("fs");
    const outputs = {};
    sst.Linkable.wrap(random.RandomUuid, (resource) => ({
      properties: {
        value: resource.result,
      },
    }));
    for (const value of readdirSync("./infra/").filter((x) =>
      x.endsWith(".ts"),
    )) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
