export const useInviteStore = defineStore("invite", {
  state: () => ({
    invite: null as any | null,
  }),
  actions: {
    setInvite(invite: any) {
      this.invite = invite;
    },
  },
});
