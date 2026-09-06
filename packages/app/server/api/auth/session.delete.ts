export default defineEventHandler(async (event) => {
  deleteCookie(event, "nuxfire-access-token");
  deleteCookie(event, "nuxfire-refresh-token");
});
