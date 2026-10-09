export default defineEventHandler(async (event) => {
  const session = await getUser(event);
  if (session?.id) return session;
  throw createError({
    statusCode: 401,
  });
});
