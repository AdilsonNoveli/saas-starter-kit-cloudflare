import { setHyperdriveBinding } from "../utils/db";

// Cloudflare bindings are static for the lifetime of a Worker deployment, so
// capturing the Hyperdrive binding on every request (same pattern as
// authorization-resolver.ts) is safe even under concurrent requests within
// one isolate — it's just re-set to the same value.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    const binding = event.context?.cloudflare?.env?.AppDB;
    if (binding) setHyperdriveBinding(binding);
  });
});
