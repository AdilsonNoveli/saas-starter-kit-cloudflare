import { defineStore } from "pinia";
import type { RouterOutput } from "~~/server/trpc/routers";

type Notification = RouterOutput["notifications"]["list"][0];
type Notifications = Record<string, Notification>;

export const useNotificationsStore = defineStore("notifications", {
  state: () => ({
    notifications: {} as Notifications,
    unread: 0,
    enabled: true,
  }),

  getters: {
    ordered(): Notification[] {
      return Object.values(this.notifications).toSorted(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
  },
  actions: {
    initializeNotificationSettings() {
      const stored = localStorage.getItem("notificationsEnabled");
      if (stored) {
        this.enabled = stored === "true";
      } else {
        localStorage.setItem("notificationsEnabled", String(this.enabled));
      }
    },

    setNotificationsEnabled(value: boolean) {
      this.enabled = value;
      localStorage.setItem("notificationsEnabled", String(value));
    },

    setNotifications(notifications: Notification[]) {
      let unread = 0;
      this.notifications = notifications.reduce((acc, notification) => {
        acc[notification.id] = notification;
        if (!notification.read) {
          unread++;
        }
        return acc;
      }, {} as Notifications);
      this.unread = unread;
    },

    addNotification(notification: Notification) {
      this.notifications[notification.id] = notification;
      if (!notification.read) this.unread++;
    },

    async fetchAllNotifications() {
      try {
        const notifications = await useTrpcClient().notifications.list.query();
        this.setNotifications(notifications);
        return notifications;
      } catch (error) {
        console.error(error);
      }
    },

    async markAsRead() {
      try {
        this.unread = 0;
        const unreadNotifications = Object.keys(this.notifications).filter(
          (id) => !this.notifications[id]?.read,
        );
        await useTrpcClient().notifications.updateReadStatus.mutate(
          unreadNotifications,
        );
        unreadNotifications.forEach((id) => {
          const notif = this.notifications[id];
          if (!notif) return;
          this.notifications[id] = {
            ...notif,
            read: true,
          };
        });
      } catch (error) {
        this.unread = Object.keys(this.notifications).filter(
          (id) => !this.notifications[id]?.read,
        ).length;
        console.error(error);
      }
    },

    async createNotification(title: string, message: string) {
      await useTrpcClient().notifications.create.mutate({
        title: title,
        message: message,
      });
    },
  },
});
