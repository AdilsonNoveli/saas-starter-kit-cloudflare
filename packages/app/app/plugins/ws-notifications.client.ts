import type { RouterOutput } from "~~/server/trpc/routers";

type Notification = RouterOutput["notifications"]["list"][0];
type WsNotificationMessage = { type?: string; payload?: Notification };

/**
 * Owns the notification side effects that used to live in `layouts/dashboard.vue`:
 * loading the persisted list, restoring the "notifications enabled" preference and
 * subscribing to the user's WebSocket topic for live notifications.
 */
export default defineNuxtPlugin({
  name: "ws-notifications",
  dependsOn: ["websockets"],
  setup() {
    const toast = useToast();
    const { user } = useSession();
    const { $ws } = useNuxtApp();
    const notificationsStore = useNotificationsStore();

    notificationsStore.initializeNotificationSettings();

    const onNotification = (data: unknown) => {
      const message = data as WsNotificationMessage;
      if (message?.type !== "notification" || !message.payload) return;

      notificationsStore.addNotification(message.payload);
      if (!notificationsStore.enabled) return;

      toast.add({
        title: message.payload.title,
        description: message.payload.message,
        duration: 3000,
        color: "primary",
      });
    };

    let subscribedTopic: string | null = null;

    watch(
      () => user.value?.id,
      (userId) => {
        if (subscribedTopic === userId) return;

        if (subscribedTopic) {
          $ws.off(subscribedTopic, onNotification);
          subscribedTopic = null;
        }

        if (!userId) return;

        subscribedTopic = userId;
        $ws.on(userId, onNotification);
        notificationsStore.fetchAllNotifications();
      },
      { immediate: true },
    );
  },
});
