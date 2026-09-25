# Lab measurements (task T044)

Run on 2026-09-25, mode CMD. Nothing here is field data: no real visitor is measured. It records
how the current build behaves under a fixed, repeatable lab profile, so a later change can be
compared with it.

## Protocol

- Tool: Lighthouse 13.5.0 (`bunx lighthouse`), performance category only, form factor mobile
  (emulated Moto G Power 2022 user agent), Chrome `headless=new`, `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Server: `scratchpad/serve.ts` (a scratch Bun static server, not in the repository) over
  `apps/web/.output/public` of `SITE_URL=https://nuxfire.com bun run build`: brotli for text
  (quality 5), `Cache-Control: public, max-age=31536000, immutable` under `/_nuxt/`, revalidation for
  the rest, `307` to remove a trailing slash. It does not reproduce the Cloudflare edge (HTTP/3,
  edge cache, its own compression settings).
- Throttling recorded in the report: 150 ms RTT, 1638.4 kbps, CPU slowdown 4x, request latency
  562.5 ms.
- Runs: three per page and per method, in sequence, same machine.

## Result 1: simulated throttling is not stable enough to quote

The default method (simulated) gave, for the same home page in three consecutive runs, LCP of
14,513 ms, 3,596 ms and 21,216 ms, with TBT between 1,061 and 1,255 ms. The trace of the third
run reported a time to first byte of 6 ms and an element render delay of 2,757 ms, so the
simulation and the observed load disagree by a factor of seven. The blog post gave 5,215, 4,842
and 5,404 ms. The simulated numbers are **not** used anywhere.

## Result 2: applied throttling (`--throttling-method=devtools`), the recorded method

| Page (build) | LCP ms (3 runs) | CLS | TBT ms | Total bytes | Notes |
| --- | --- | --- | --- | --- | --- |
| Home `/` (current) | 4,555, 4,237, 4,402 | 0.022 | 1 run reported, 2 returned NaN | 5,124,586 | LCP element is the `<h1>` (text); element render delay is 4.2 to 4.5 s, TTFB under 15 ms |
| Blog post (current) | 2,822, 2,962, 3,027 | 0.000 | 1,880, 2,435, 2,418 | 504,094 | element render delay 2.8 to 3.0 s |
| Astro docs "Getting started" (external, live) | 2,354, 2,259, 2,106 | 0.000 to 0.010 | 285, 426, 258 | about 126,130 | same protocol, run over the real network from this machine |

Limit values of the sources: LCP 2.5 s. **The current home page and blog post are above 2.5 s in
this profile; the Astro page is at or below it.** It is a lab profile: a real visitor's device and
network can be better or worse, and the field data (Search Console, CrUX) is what decides.

## What the trace says about the home page (current build)

- Render-blocking: `entry.*.css` (34,719 bytes on the wire in this run) and `BackgroundDots.*.css`
  (347 bytes) block the first paint; Lighthouse estimates 440 ms of savings.
- The two WOFF2 fonts (23,264 and 29,444 bytes) are on the critical chain behind the CSS.
- The home page also fetches `sqlite3.wasm` (864,916 bytes) and two `sql_dump.txt` files of Nuxt
  Content (139,103 and 132,573 bytes), and six JPEG avatars (446,942 to 620,792 bytes each).
- One JavaScript file (`1wom1wjX.js`, 59,967 bytes) is reported 52 % unused.
- The gate's baseline for the home page (brotli quality 9): html 23,429, js 280,276, css 33,150,
  images 3,447,493 bytes, 64 requests.

## Not measured

- INP: headless Lighthouse loads a page and does not interact with it.
- TBT of the home page: two of three runs returned `NaN` for total blocking time; the cause was
  not investigated. The value is not quoted.
- Field data. Also the effect of the Cloudflare edge.
- Any interaction after load (menus, language switch, color mode).

## Icons and the size of the home HTML

The final builds of 2026-09-25 showed that the inline icon CSS of `/` is not deterministic: Nuxt Icon (`serverBundle` `remote` for the Cloudflare preset, see `node_modules/@nuxt/icon/dist/module.mjs`) fetches icons from Iconify during prerender with a 1,500 ms timeout. Build A logged timeouts and left 24 of 37 icons of `/` undefined in the HTML (inline icon CSS 7,122 characters, html 21,948 bytes brotli); build B, with the same source, defined all 37 (html 23,431 bytes). The earlier build of the same day also defined all 37 (22,551 characters). A missing inline icon is fetched at runtime.
