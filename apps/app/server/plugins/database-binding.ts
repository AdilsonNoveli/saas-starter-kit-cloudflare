import type { H3Event } from "h3";
import { setHyperdriveBinding, closeDB } from "../utils/db";

// Cloudflare bindings are static for the lifetime of a Worker deployment, so
// capturing the Hyperdrive binding on every request (same pattern as
// authorization-resolver.ts) is safe even under concurrent requests within
// one isolate — it's just re-set to the same value.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    const binding = event.context?.cloudflare?.env?.AppDB;
    if (binding) setHyperdriveBinding(binding);
  });

  // Closes whatever postgres.js client useDB() opened for this request — see
  // the doc comment on closeDB() in ../utils/db.ts for the leak this closes.
  // Registered on both hooks because a thrown error can short-circuit before
  // `afterResponse` fires; closeDB() is safe to call twice either way (it
  // clears its own reference before awaiting). Scheduled through the Workers
  // ExecutionContext's waitUntil so the isolate stays alive long enough for
  // `await client.end()` to actually finish — without it, Cloudflare can
  // freeze/terminate the isolate right after the response is flushed.
  const scheduleClose = (event: H3Event) => {
    const closing = closeDB(event);
    // Cloudflare's ExecutionContext.waitUntil is a host method, not a plain
    // JS function — calling it detached from `context` (e.g. hoisting it
    // into a local `const` first, the way this used to read) throws
    // "TypeError: Illegal invocation: function called with incorrect `this`
    // reference" (workerd's own binding check), which took the whole App
    // Worker down with a 500 on every request. Must be invoked as
    // `context.waitUntil(...)`, never `const fn = context.waitUntil; fn(...)`.
    const context = event.context?.cloudflare?.context;
    if (context?.waitUntil) {
      context.waitUntil(closing);
    } else {
      closing.catch(() => {});
    }
  };

  nitroApp.hooks.hook("afterResponse", (event) => scheduleClose(event));
  nitroApp.hooks.hook("error", (_error, context) => {
    if (context.event) scheduleClose(context.event);
  });
});
