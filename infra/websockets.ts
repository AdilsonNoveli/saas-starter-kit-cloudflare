import { flags } from "#movimenta-bairro/config";
import { websocketsDomain, websocketsUrl } from "./dns";
import { COMPATIBILITY } from "./utils/constants";
import { isDurableObjectClassProvisioned } from "./utils/durable-objects";

// Signs the short-lived WS auth ticket minted by /api/auth/ws-ticket
// (see packages/app/server/utils/ws-ticket.ts) — shared only between the App
// worker and this one, never exposed to the browser.
export const wsTicketSecret = flags.websockets
  ? new random.RandomUuid("WsTicketSecret")
  : undefined;

// Checked once per deploy, before constructing the Worker, so the
// (synchronous) transform.worker callback below can decide from a plain
// boolean rather than needing to be async itself. `$app.stage` scopes the
// check to THIS stage's own script — an established stage's already-live
// class is never resent (Cloudflare permanently rejects that, see
// infra/utils/durable-objects.ts), while a genuinely new stage still gets
// it provisioned automatically, with no manual step.
const websocketsClassProvisioned = flags.websockets
  ? await isDurableObjectClassProvisioned("Websockets", $app.stage)
  : true;

export const websockets = flags.websockets
  ? new sst.cloudflare.Worker(
      "Websockets",
      {
        // relative — see infra/emails.ts for why
        handler: "packages/functions/src/websockets.js",
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
            // `new_sqlite_classes` is a ONE-TIME provisioning instruction,
            // not a recurring declaration — Cloudflare permanently rejects
            // resending it once the class has any existing Durable Object
            // (error 10074: "already depended on by existing Durable
            // Objects"), regardless of migration tags. Only include it
            // when the live check above found the class doesn't exist yet
            // for this stage.
            if (!websocketsClassProvisioned) {
              args.migrations = { newSqliteClasses: ["Websockets"] };
            }
          },
        },
      },
    )
  : undefined;

export const outputs = flags.websockets
  ? {
      Websockets: websocketsUrl.properties.value,
    }
  : undefined;
