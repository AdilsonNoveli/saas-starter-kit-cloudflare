import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import crossws from "crossws/adapters/cloudflare-durable";
import { verifyWsTicket } from "@nuxfire/crypto";

function toBufferLike(val) {
  if (val === undefined || val === null) {
    return "";
  }
  const type = typeof val;
  if (type === "string") {
    return val;
  }
  if (type === "number" || type === "boolean" || type === "bigint") {
    return val.toString();
  }
  if (type === "function" || type === "symbol") {
    return "{}";
  }
  if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
    return val;
  }
  if (isPlainObject(val)) {
    return JSON.stringify(val);
  }
  return val;
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (
    prototype !== null &&
    prototype !== Object.prototype &&
    Object.getPrototypeOf(prototype) !== null
  ) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

let environment;
let _user;
let storage;

// Single extension point for topic authorization: add a case per topic
// pattern here (e.g. `team:*`) instead of scattering ad-hoc checks — every
// new topic type must go through this function.
function canSubscribeToTopic(user, topic) {
  return user?.id === topic;
}

const instanceName = "main";
const bindingName = "Websockets";
const ws = crossws({
  instanceName,
  bindingName,
  hooks: {
    async open(peer) {
      const user = _user;
      _user = undefined;
      if (user) {
        await storage.put(`user:${peer.id}`, user);
      }
    },
    async message(peer, message) {
      try {
        const data = message.json();
        if (data?.action === "auth") {
        } else if (data.action === "subscribe") {
          const user = await storage.get(`user:${peer.id}`);
          if (canSubscribeToTopic(user, data.topic)) peer.subscribe(data.topic);
        } else if (data.action === "unsubscribe") {
          peer.unsubscribe(data.topic);
        }
      } catch (err) {
        console.log("err handling message", message.text(), err);
      }
    },
    async close(peer) {
      await storage.delete(`user:${peer.id}`);
    },
  },
});

export default class Worker extends WorkerEntrypoint {
  // Only reachable via the Cloudflare service binding (env.Websockets in
  // trpc/context.ts) — that's Worker-to-Worker RPC, never a public HTTP
  // route, so this doesn't need its own auth check.
  async publish(topic, data) {
    const binding = this.env[bindingName];
    const stub = binding.get(binding.idFromName(instanceName));
    await stub.publish(topic, data);
    return new Response(null);
  }
  async fetch(request) {
    return ws.handleUpgrade(request, this.env, this.ctx);
  }
}

function getAttachedState(ws) {
  let state = ws.deserializeAttachment() || {};
  return state;
}

export class Websockets extends DurableObject {
  constructor(state, env) {
    super(state, env);
    // let's make the storage available globally so that
    // it can be used from inside crossws hooks
    this.storage = state.storage;
    storage = this.storage;
    environment = env;
    ws.handleDurableInit(this, state, env);
  }

  async publish(topic, data) {
    try {
      const websockets = this.ctx.getWebSockets();
      if (websockets.length < 1) {
        return;
      }
      const dataBuff = toBufferLike(data);
      for (const ws of websockets) {
        const state = getAttachedState(ws);
        if (state.t?.has(topic)) {
          ws.send(dataBuff);
        }
      }
      return null;
    } catch (err) {
      console.error("publish err", err);
    }
  }

  async fetch(request) {
    if (request.headers.get("upgrade") === "websocket") {
      // we are storing the token inside Sec-Websocket-Protocol header because it's
      // the only header that can be passed when using the WebSocket browser api
      const protocols = request.headers
        .get("sec-websocket-protocol")
        .split(",")
        .map((x) => x.trim());
      const token = protocols.shift();
      const verified = await verifyWsTicket(environment.WsTicketSecret, token);
      if (verified) {
        _user = {
          id: verified.id,
          email: verified.email,
          name: verified.name,
          image: verified.image,
        };
      }
      const newHeaders = new Headers(request.headers);
      newHeaders.set("sec-websocket-protocol", protocols.join(","));
      const newRequest = new Request(request.url, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
      });
      // fix: for chrome, we need to select a protocol and send
      // it in the response manually or the browser throws an error
      // (cloudflare doesn't do this for us automatically)
      const res = await ws.handleDurableUpgrade(this, newRequest);
      res.headers.set("sec-websocket-protocol", protocols[0]);
      return res;
    }
    return new Response(null);
  }

  webSocketMessage(client, message) {
    return ws.handleDurableMessage(this, client, message);
  }

  webSocketClose(client, code, reason, wasClean) {
    return ws.handleDurableClose(this, client, code, reason, wasClean);
  }
}
