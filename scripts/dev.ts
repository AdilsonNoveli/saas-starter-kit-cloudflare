import { Resource } from "sst";
import { resolve } from "path";
import { flags } from "#nuxfire/config";

const packageName = process.argv[2];
const customCommand = process.argv[3] === "--";
const isRemote = process.argv[3] === "remote";

const proc = Bun.spawn(
  customCommand
    ? process.argv.slice(4)
    : ["bun", "run", "dev", ...(isRemote ? ["--remote"] : [])],
  {
    cwd: resolve(process.cwd(), `apps/${packageName}`),
    stdio: ["inherit", "inherit", "inherit"],
    env: {
      NUXT_HUB_PROJECT_URL:
        packageName === "app" ? Resource.AppUrl.value : Resource.WebUrl.value,
      NUXT_HUB_PROJECT_SECRET_KEY:
        packageName === "app"
          ? Resource.AppNuxtHubSecret.value
          : Resource.WebNuxtHubSecret.value,
      NUXT_PUBLIC_AUTH_CLIENT_ID: Resource.AppAuthClientID.value,
      NUXT_PUBLIC_AUTH_URL: Resource.AuthUrl.value,
      NUXT_PUBLIC_APP_URL: Resource.AppUrl.value,
      NUXT_PUBLIC_CHECKOUT_URL: Resource.CHECKOUT_URL.value,
      ...(flags.websockets
        ? { NUXT_PUBLIC_WEBSOCKETS_ENDPOINT: Resource.WebsocketsUrl.value }
        : {}),
      ...(flags.stripe
        ? {
            NUXT_STRIPE_WEBHOOK_SECRET_KEY:
              Resource.STRIPE_WEBHOOK_SECRET_KEY.value,
            NUXT_STRIPE_SECRET_KEY: Resource.STRIPE_SECRET_KEY.value,
          }
        : {}),
      ...(flags.paddle
        ? {
            NUXT_PADDLE_API_KEY: Resource.PADDLE_API_KEY.value,
            NUXT_PADDLE_WEBHOOK_SECRET: Resource.PADDLE_WEBHOOK_SECRET.value,
            NUXT_PUBLIC_PADDLE_CLIENT_TOKEN:
              Resource.PADDLE_CLIENT_TOKEN.value,
            NUXT_PUBLIC_PADDLE_ENVIRONMENT: "sandbox",
          }
        : {}),
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
    },
  },
);

process.on("SIGINT", () => proc.kill());
process.on("SIGTERM", () => proc.kill());
process.on("exit", () => proc.kill());
