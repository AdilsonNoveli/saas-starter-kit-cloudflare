export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const { wsTicketSecret } = useRuntimeConfig(event);
  const ticket = await createWsTicket(wsTicketSecret, {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    image: user.image ?? "",
  });
  return { ticket };
});
