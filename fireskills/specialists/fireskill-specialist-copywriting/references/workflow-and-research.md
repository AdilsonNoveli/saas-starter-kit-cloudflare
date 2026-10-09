# Workflow and Research (brief, voice of customer, messaging hierarchy, review)

The order of work for a text that has to persuade or explain. The sources agree on one thing that
matters more than any formula: the words come from the reader, and the research comes first.
The results these authors quote for their own clients are their case studies; they show that a
method worked once for one business and are never used as a promise or a claim on a Nuxfire page.

## 1. Sourced facts

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| W1 | Conversion copywriting is copy that moves the reader to "yes" using voice-of-customer data, frameworks, formulas and persuasion techniques. Its process has three parts of unequal size: research and discovery, writing / wireframing / editing, validation and experimentation. You start with research because voice of customer is where the copy comes from ("you can't write great copy without it"); editing is the last step before validation; validation can be a clarity or preference test as well as a split test. | https://copyhackers.com/conversion-copywriting-defined/ | 2026-09-25 | RAW |
| W2 | A messaging hierarchy is the order in which the messages of a page convince. Three questions decide it: what the visitor is thinking on arrival, what they should do by the end, and how their thinking must change in between; the answer to the third decides what goes on the page and how long it needs to be. | https://copyhackers.com/2016/06/copywriting-principles-sweatblock/ | 2026-09-25 | RAW |
| W3 | The "10/90" layout rule: roughly the top 10 % of a page matches the visitor's stage of awareness and the message that brought them; the rest convinces, answering in order: what do you do, why should I care, do others like me care, how do you do it, how will my life improve, why is it safe to believe you, what now. The author says the order is a solid starting point, not a law that works 100 % of the time. | https://copyhackers.com/2016/06/copywriting-principles-sweatblock/ | 2026-09-25 | RAW |
| W4 | Editing has "sweeps"; the specificity sweep looks for places to be more specific so the reader can picture the thing: one topic at a time, do not make the reader connect the dots, unpack summaries into concrete detail. The first draft is expected to be rough and to hold the messages, found through voice-of-customer data, in the right order. | https://copyhackers.com/how-to-be-specific/ | 2026-09-25 | RAW |
| W5 | Voice-of-customer research (CXL, published 2020-06-21, updated 2024-06-17): ask customers what triggered the search, what problem the product lessens, which alternatives they considered and what made them hesitate; mine the answers for needs, pain points and hesitations, count recurring themes, compare them with the page to find communication gaps, then test. | https://cxl.com/blog/voice-of-customer/ | 2026-09-25 | RAW |
| W6 | A B2B value proposition (CXL, published 2025-05-20, updated 2025-10-30) is a customer-first statement of why the product solves a high-priority problem better than the alternatives for a specific buyer; define who it is for and who it is not for; list real pain points and test each; be specific about context; test continuously. Template: for [buyer] who [problem], [product] is the [category] that [mechanism]; unlike [alternatives], it [difference]. | https://cxl.com/blog/b2b-value-proposition/ | 2026-09-25 | RAW |
| W7 | Google asks for people-first content: an audience the content would help, first-hand expertise, a primary purpose, a reader who leaves with enough to reach their goal; it warns against summarising others without adding value and against writing to a word count. | https://developers.google.com/search/docs/fundamentals/creating-helpful-content | 2026-09-25 | RAW |

## 2. The workflow as Nuxfire runs it (DECISION, built on W1 to W7)

| Id | Step | What is written down | Source | Read | Mode |
| --- | --- | --- | --- | --- | --- |
| S1 | Brief | Reader, stage of awareness, what they think on arrival, what they should do at the end, what must change in between, the one claim the text stands on | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-014 and W2 | 2026-09-25 | DECISION |
| S2 | Reader's words | Quotes with their source (interview, support thread, review, community post); if none exist, the line "no voice-of-customer data; hypothesis" | W1, W5 | 2026-09-25 | DECISION |
| S3 | Hierarchy | The ordered list of messages (W3) with the block that carries each; length follows | W2, W3 | 2026-09-25 | DECISION |
| S4 | Draft | Structures from `pattern-library.md`; placeholders `{claim}` where a ledger record will supply the fact | pattern-library.md | 2026-09-25 | DECISION |
| S5 | Claims | Each claim gets a ledger record or is removed | claims-and-compliance.md | 2026-09-25 | DECISION |
| S6 | Sweeps | Specificity (W4), then clarity (one idea per block), then the compliance read | W4 | 2026-09-25 | DECISION |
| S7 | Localise | Transcreate marketing text, translate interface text faithfully | spec.md DEC-015 | 2026-09-25 | DECISION |
| S8 | Review | A second pass, separate from the drafting one, reads against the brief and the ledger | fireskills/specialists/fireskill-specialist-copywriting/SKILL.md, workflow step 7 | 2026-09-25 | DECISION |
| S9 | Validate | `check:copy`, `check:i18n`, `check:seo` for titles; then test with readers when there is traffic | W1 | 2026-09-25 | DECISION |

## 3. Using the brief

- The one claim the text stands on is the thing the reader must believe to act. If it cannot be
  proven with the ledger, the page has a different problem than wording.
- "Hypothesis" copy is allowed and is marked as such in the brief; it is not presented to the
  reader as fact (no invented customers, no invented numbers).
- Writing for a developer or a founder: their words are the names of the things they do
  (deploy, migrate, invite a teammate). Use those before abstractions such as "streamline".

## 4. What this reference does NOT establish

- That any wording converts better: no test of Nuxfire copy exists; the sources describe methods,
  not effect sizes to expect.
- The reading level to write at, or a word count per block: none of the pages read states a
  requirement for one that applies here.
- Voice-of-customer data for Nuxfire: none is stored in the repository. `nuxfire-copy-delivery.md`
  records this.
