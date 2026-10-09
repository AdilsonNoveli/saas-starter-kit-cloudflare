# Headlines, Titles, Descriptions and Buttons

The short texts carry the most weight and the most risk: they are read first, they are what a
search result shows, and they are where a promise is made. This file states what the sources ask
of them.

## 1. Sourced facts

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| T1 | Copyblogger's framework for a headline asks three questions before any tip: what does the content deliver, what is the goal of the person reading it, and only then what element of intrigue to add. Intrigue is called the least important; clarity is prioritised over cleverness; a headline that promises what the page does not deliver misleads the reader, who then leaves. | https://copyblogger.com/how-to-write-headlines-that-work/ | 2026-09-25 | RAW |
| T2 | The same article separates clickbait (false promises made only to earn clicks) from a curiosity gap whose value to the reader is still clear ("the strategy I used to double my clicks" names what the reader will get). | https://copyblogger.com/how-to-write-headlines-that-work/ | 2026-09-25 | RAW |
| T3 | Button copy is either a **call to value** (amplifies the value of moving forward; best before the reader has decided) or a **call to action** (amplifies the action; best after they decided, to make it frictionless). Both can appear on one page if the page has a single goal. | https://copyhackers.com/2016/06/copywriting-principles-sweatblock/ | 2026-09-25 | RAW |
| T4 | Being specific engages the reader's imagination: one topic at a time, concrete details, unpacked summaries, and not leaving the reader to connect the dots. | https://copyhackers.com/how-to-be-specific/ | 2026-09-25 | RAW |
| T5 | Google: the title of a page should be a descriptive, helpful summary of the content and should not exaggerate or shock; a snippet is built from the page and may use the meta description when it describes the page better; different searches can show different snippets. | https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://developers.google.com/search/docs/appearance/snippet | 2026-09-25 | RAW |
| T6 | Bing: missing, duplicate or overly short titles and descriptions can reduce indexing reliability, ranking and grounding eligibility; each URL focuses on one topic and puts key information early. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |

## 2. Rules derived from T1 to T6

| Id | Rule | Basis | Source | Read | Mode |
| --- | --- | --- | --- | --- | --- |
| R1 | Write the headline from what the page delivers and what the reader is trying to do; then add intrigue only if clarity is already there. | T1 | https://copyblogger.com/how-to-write-headlines-that-work/ | 2026-09-25 | DECISION |
| R2 | Draft several headlines, choose against the page, and read each as the reader would see it in a result or a card, in its language. | T1, T5 | https://copyblogger.com/how-to-write-headlines-that-work/ | 2026-09-25 | DECISION |
| R3 | A title is unique across the site and says what the page is; "Demo SaaS" is a placeholder, and `check:seo` fails it (`title-not-placeholder`). A description is written for the page, not reused. | T5, T6 | scripts/seo-rules.ts | 2026-09-25 | CODE |
| R4 | A hero states the one claim of the page in the reader's words, names who it is for, and gives one primary button. | T3, W3 | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-014 | 2026-09-25 | DECISION |
| R5 | Before the reader decided: a call to value ("See how a tenant is isolated"). After they decided: a call to action that names what they get ("Get the starter kit"). A button that changes state says what will happen ("Delete workspace", not "Submit"). | T3 | https://copyhackers.com/2016/06/copywriting-principles-sweatblock/ | 2026-09-25 | DECISION |
| R6 | A headline that contains a number, a comparison, a guarantee or a superlative is a claim and needs its ledger record before it ships. | claims-and-compliance.md | .fireskills/CLAIMS.yml | 2026-09-25 | DECISION |
| R7 | The words above the fold are the largest text of the page: the LCP element of the home page is its `<h1>` (declared in `perf-budgets.json`, seen in the lab trace), so what delays that text (render-blocking CSS, fonts) delays the page. Keep the headline short and let `$fireskill-specialist-web-performance` measure it. | web-vitals-and-budgets.md | perf-budgets.json | 2026-09-25 | CODE |

## 3. Checklist before a headline or button ships

1. What does the page deliver? Is that what the headline says?
2. Would the reader recognise their own situation or goal in it?
3. Is there a claim in it? If so, where is the ledger record?
4. Is there a curiosity gap? If so, is the answer in the first screen?
5. Does the button name the outcome or the step, at the right stage?
6. Does it read as natural in `en`, `pt-br` and `es` (not translated word by word)?

## 4. What this reference does NOT establish

- A best length for a title, a description or a headline: Google's snippet page gives none and
  says truncation varies by device; Copyblogger's figures are the author's own observations and
  are not used here.
- That a call to value beats a call to action, or the reverse, for Nuxfire: T3 says which stage
  each suits; only a test on this site can say more.
- Anything about Bing's snippet length.
