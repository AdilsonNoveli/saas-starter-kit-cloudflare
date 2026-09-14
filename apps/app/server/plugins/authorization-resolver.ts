export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", async (event) => {
    event.context.$authorization = {
      resolveServerUser: async () => await getUser(event),
    };
  });
});
