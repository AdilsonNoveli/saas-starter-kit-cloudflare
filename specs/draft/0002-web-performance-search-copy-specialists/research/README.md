# Research index — SPEC-0002

All access dates are 2026-09-25 unless stated. Evidence is stored as paraphrases with the URL,
never as reproduced pages (licences differ; nothing here is a copy of a source).

## Reading modes (how much to trust a note)

| Mode | Meaning | What to do before turning the note into a rule |
| --- | --- | --- |
| **RAW** | The page text was read in full in a browser (`get_page_text`) or from the code. | Cite the note; still re-open the URL when writing the specialist reference. |
| **SUM** | The page was fetched by a tool that returns a model-written summary of it. | Re-read the page RAW when authoring the reference file (tasks T046, T047, T051). A SUM note is a lead, not a verdict. |
| **CMD** | Output of a command run in this repository or against a public URL. | The command is recorded so it can be re-run; values can change after a deploy. |
| **CODE** | A statement about the installed package or the repository, read from `node_modules` or the source tree. | Re-check after a dependency upgrade. |

## Files

| File | Subject |
| --- | --- |
| `astro-reference.md` | What Astro documents as its performance model, and Astro's own docs page measured as a reference |
| `google-search.md` | Google Search Central: helpful content, Core Web Vitals, snippets, structured data policies, FAQ and SoftwareApplication, JavaScript SEO |
| `web-dev.md` | web.dev: Core Web Vitals thresholds, LCP, INP, performance budgets, fonts |
| `bing-webmaster.md` | Bing Webmaster Guidelines (read RAW), IndexNow, sitemaps and `lastmod` |
| `schema-org.md` | schema.org types relevant to Nuxfire pages |
| `copy-sources.md` | Copyhackers, CXL, Copyblogger, Nielsen Norman Group, WCAG 3.3 |
| `compliance-claims.md` | 16 CFR 465, EU Directive 2005/29/EC Annex I(7), Brazilian CDC arts. 36-38 |
| `nuxt-cloudflare-capabilities.md` | What Nuxt 4.5.2, Nitro, `@nuxt/image` and Cloudflare Static Assets can do (CODE, CMD, docs) |
| `baseline-measurements.md` | Measured state of the Nuxfire home, the live site headers and the Astro reference |
| `copywiter-material-analysis.md` | Structure, volume and risk classes of `docs/copywiter/` (37 files; the folder is no longer on the machine) |
| `raw-reads.md` | Pages re-read RAW while writing the references (Google, Bing, IndexNow, Cloudflare, Astro, schema.org, NN/g, WCAG, Copyblogger, Copyhackers); supersedes the SUM rows |
| `redirect-spike.md` | Trailing-slash and redirect behaviour reproduced on a local Worker, and the final live audit |
| `lab-measurements.md` | Lighthouse protocol and results for the home page, a blog post and the Astro docs page |
| `zero-js-spike.md` | `noScripts` on `/` and `/blog/**`: bytes, LCP, and what stops working |

Sources that could **not** be read: the Bing help pages through the fetch tool (returned an empty
shell; solved by reading them in a browser), CXL through the fetch tool (HTTP 403; solved the same
way), X/Twitter documentation (not needed here). No claim in this spec depends on a source that
was not read.
