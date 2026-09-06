export default defineEventHandler(async (event) => {
  deleteCookie(event, "movimenta-bairro-access-token");
  deleteCookie(event, "movimenta-bairro-refresh-token");
});
