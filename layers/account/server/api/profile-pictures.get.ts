import { z } from "zod/v4";

const querySchema = z.object({
  key: z.string().startsWith("profile/"),
});

export default eventHandler(async (event) => {
  const result = querySchema.safeParse(getQuery(event));
  if (!result.success) throw createError({ status: 404 });
  return hubBlob().serve(event, result.data.key);
});
