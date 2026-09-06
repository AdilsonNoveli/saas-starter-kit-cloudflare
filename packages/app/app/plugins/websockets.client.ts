export default defineNuxtPlugin({
  name: "websockets",
  parallel: true,
  async setup() {
    const endpoint = useRuntimeConfig().public.websocketsEndpoint;
    // a short-lived, single-purpose ticket instead of the real access token —
    // the sec-websocket-protocol header is the only way to authenticate a
    // browser WebSocket connection, and anything placed there is readable by
    // page JS, so we don't want the long-lived session token there.
    // A logged-out visitor has no session, so this legitimately 401s — that
    // isn't fatal, it just means no live connection for this page load.
    const ticket = await $fetch("/api/auth/ws-ticket")
      .then((r) => r.ticket)
      .catch(() => null);

    const { status, data, send } = ticket
      ? useWebSocket(endpoint, {
          autoReconnect: true,
          protocols: [ticket, "movimenta-bairro"],
        })
      : { status: ref<"OPEN" | "CONNECTING" | "CLOSED">("CLOSED"), data: ref(null), send: () => {} };
    const topics = new Set<string>();
    const handlers = new Map<string, Set<(data: unknown) => void>>();

    const ws = {
      subscribe: (topic: string) => {
        topics.add(topic);
        send(JSON.stringify({ action: "subscribe", topic }));
      },
      unsubscribe: (topic: string) => {
        send(JSON.stringify({ action: "unsubscribe", topic }));
        topics.delete(topic);
        // also clean up handlers for this topic
        handlers.delete(topic);
      },
      on: (topic: string, handler: (data: unknown) => void) => {
        if (!topics.has(topic)) ws.subscribe(topic);
        if (!handlers.has(topic)) {
          handlers.set(topic, new Set());
        }
        handlers.get(topic)?.add(handler);
      },
      off: (topic: string, handler: (data: unknown) => void) => {
        const topicHandlers = handlers.get(topic);
        if (topicHandlers) {
          topicHandlers.delete(handler);
          if (topicHandlers.size === 0) {
            // auto unsubscribe if there are no handlers for a topic
            ws.unsubscribe(topic);
            handlers.delete(topic);
          }
        }
      },
    };

    watch(data, (message) => {
      try {
        const parsedData = JSON.parse(message as string);
        const topic = parsedData.topic;
        if (topic && handlers.has(topic)) {
          const topicHandlers = handlers.get(topic);
          topicHandlers?.forEach((handler) => handler(parsedData.data));
        }
      } catch (err) {
        console.error("Error processing websocket message:", err);
      }
    });

    watch(status, (status) => {
      if (status === "OPEN") {
        // resubscribe to all topics on reconnect
        topics.forEach((topic) => ws.subscribe(topic));
      }
    });

    return {
      provide: { ws },
    };
  },
});
