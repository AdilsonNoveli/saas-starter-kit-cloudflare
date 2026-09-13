export default defineNuxtRouteMiddleware(async (to) => {
  const inviteId = (to.params.id || "") as string;
  useInviteStore().setInvite(
    await useTrpcClient().invites.getInvite.query({
      inviteId,
    }),
  );
});
