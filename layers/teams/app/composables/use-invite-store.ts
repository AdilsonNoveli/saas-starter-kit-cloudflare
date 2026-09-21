import type { RouterOutput } from "~~/server/trpc/routers";

type Invite = RouterOutput["invites"]["getInvite"];

export const useInviteStore = defineStore("invite", {
  state: () => ({
    invite: null as Invite | null,
  }),
  actions: {
    setInvite(invite: Invite) {
      this.invite = invite;
    },
  },
});
