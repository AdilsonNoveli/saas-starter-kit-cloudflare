/**
 * Ships as Report-Only, not enforcing: this codebase has never had a CSP
 * before, and turning one on as enforcing — with no live environment here to
 * click through every page against it first — risks silently breaking
 * something (an inline style, an icon sprite, Paddle's checkout overlay)
 * with no way to catch it before it reaches production. Report-Only logs
 * violations to the browser console without blocking anything: the correct
 * first rollout step is watching real traffic against it, then switching the
 * header name to `Content-Security-Policy` (enforcing) once nothing
 * unexpected shows up.
 *
 * Paddle's checkout overlay is the one thing this app actually embeds
 * (`cdn.paddle.com`'s script, Paddle's own hosted checkout in an iframe) —
 * Stripe Checkout is a full-page redirect (`navigateTo(url, {external:
 * true})` in use-payments.ts), not an embed, so it needs nothing here.
 */
export default defineEventHandler((event) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://cdn.paddle.com",
    "frame-src 'self' https://*.paddle.com",
    "connect-src 'self' https://*.paddle.com",
    "img-src 'self' data: https:",
    // Vue compiles `:style` bindings to real inline `style` attributes —
    // without this, that alone would flood the report with noise unrelated
    // to any real risk.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");

  setResponseHeader(event, "Content-Security-Policy-Report-Only", csp);
});
