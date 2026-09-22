import { flags } from "#nuxfire/config";
import { websocketsDomain, websocketsUrl } from "./dns";
import { COMPATIBILITY } from "./utils/constants";
import { isDurableObjectClassProvisioned } from "./utils/durable-objects";

// Signs the short-lived WS auth ticket minted by /api/auth/ws-ticket
// (see apps/app/server/utils/ws-ticket.ts) — shared only between the App
// worker and this one, never exposed to the browser.
export const wsTicketSecret = flags.websockets
  ? new random.RandomUuid("WsTicketSecret")
  : undefined;

export const websockets = flags.websockets
  ? new sst.cloudflare.Worker(
      "Websockets",
      {
        // relative — see infra/emails.ts for why
        handler: "apps/functions/src/websockets.js",
        domain: websocketsDomain,
        compatibility: COMPATIBILITY,
        environment: {
          WsTicketSecret: wsTicketSecret!.result,
        },
        transform: {
          worker: (args) => {
            args.bindings = $output(args.bindings ?? []).apply((bindings) => [
              ...bindings,
              {
                type: "durable_object_namespace",
                name: "Websockets",
                className: "Websockets",
              },
            ]);
            // Whether to send the migration is decided from Cloudflare itself,
            // using the exact account and script name SST is about to PUT
            // (see infra/utils/durable-objects.ts for why). `transform.worker`
            // is synchronous, so the async check is deferred through
            // `$resolve(...).apply(...)` — same pattern as infra/utils/builder.ts.
            args.migrations = $resolve({
              accountId: args.accountId,
              scriptName: args.scriptName,
            }).apply(async ({ accountId, scriptName }) =>
              (await isDurableObjectClassProvisioned({
                className: "Websockets",
                accountId,
                scriptName,
              }))
                ? undefined
                : { newSqliteClasses: ["Websockets"] },
            );
          },
        },
      },
    )
  : undefined;

export const outputs = websocketsUrl
  ? {
      Websockets: websocketsUrl.properties.value,
    }
  : undefined;
