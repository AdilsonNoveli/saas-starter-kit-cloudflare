import type { inferAsyncReturnType } from "@trpc/server";
import type { H3Event } from "h3";
import { sender } from "@nuxfire/functions/sender";

export async function createContext(event: H3Event) {
  const session = await getUser(event);
  const origin = getRequestURL(event).origin;
  const runtimeConfig = useRuntimeConfig(event);
  const ip = getRequestIP(event);
  const sendEmail = sender(event.context?.cloudflare?.env?.Emails);
  const sendWebsocketsEvent = (topic: string, data: unknown) => {
    const websocketsBinding = event.context?.cloudflare?.env?.Websockets;
    if (websocketsBinding) {
      return websocketsBinding.publish(topic, { data, topic });
    }
  };
  const jobsQueue = event.context?.cloudflare?.env?.JobQueue;
  return {
    ip,
    event,
    origin,
    session,
    sendEmail,
    sendWebsocketsEvent,
    runtimeConfig,
    jobsQueue,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
