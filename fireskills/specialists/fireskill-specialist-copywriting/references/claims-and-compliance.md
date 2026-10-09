# Claims, Testimonials, Urgency and Compliance

Not legal advice. These are what the primary texts say, turned into engineering rules. The owner
confirms with a lawyer which rules apply to the markets served; the jurisdictions read here (United
States, European Union, Brazil) are an assumption to confirm (SPEC-0002 Q-03), chosen because the
product is sold in English, Portuguese and Spanish.

## 1. What the primary texts say

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| L1 | United States, 16 CFR Part 465 (Consumer Reviews and Testimonials, current as of 2026-09-23): it is an unfair or deceptive practice to write, create or sell a consumer review, consumer testimonial or celebrity testimonial that materially misrepresents that the reviewer exists, that they used the product, or their experience (465.2); no compensation or incentive conditioned on a particular sentiment (465.4); officers, managers and agents who write reviews or testimonials must disclose the relationship clearly and conspicuously (465.5); an internet disclosure must be unavoidable and appear in each language in which the representation appears (465.1(c)). | https://www.ecfr.gov/current/title-16/part-465 | 2026-09-25 | RAW |
| L2 | European Union, Directive 2005/29/EC, Annex I, point 7 (practices unfair in all circumstances): falsely stating that a product will be available only for a very limited time, or on particular terms for a very limited time, to elicit an immediate decision and deprive consumers of enough time to make an informed choice. Only this item was read. | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32005L0029 | 2026-09-25 | RAW |
| L3 | Brazil, Código de Defesa do Consumidor (Lei 8.078/1990): the supplier keeps the factual, technical and scientific data that support an advertising message for those interested (art. 36, sole paragraph); misleading advertising, including by omission and information capable of inducing error about nature, characteristics, quality, quantity, properties, origin or price, is prohibited (art. 37, paras. 1 and 3); abusive advertising includes exploiting fear (art. 37, para. 2); the burden of proving the truth of the information lies with the sponsor (art. 38). | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm | 2026-09-25 | RAW |
| L4 | Google's warning signs of search-engine-first content include promising an answer that does not exist and changing dates to look fresh; its structured-data rules forbid marking up fake reviews. | https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://developers.google.com/search/docs/appearance/structured-data/sd-policies | 2026-09-25 | RAW |
| L5 | Bing lists misleading structured data, scraped and thin content, and hidden text aimed at Bing or Copilot among practices that can reduce ranking or remove a site. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |

## 2. Engineering rules (derived from L1 to L5)

| Id | Rule | Basis | Source | Read | Mode |
| --- | --- | --- | --- | --- | --- |
| K1 | Every factual claim on a page (a number, a superlative, a comparison, a guarantee, a result, "zero", "100 %", "millions") has a ledger entry holding its evidence, so the proof exists before the question is asked. | L3 art. 36 and 38, L4 | .fireskills/CLAIMS.yml | 2026-09-25 | DECISION |
| K2 | A testimonial exists only if the person exists, used the product and consented; each is a ledger record with provenance; a photo is not reused for a different person. | L1 (465.2), L5 | .fireskills/CLAIMS.yml | 2026-09-25 | DECISION |
| K3 | A countdown, "only today", "last spots" or a price deadline exists only if a real, dated, enforced limit is recorded (`offers`); the copy reads the date from the record. | L2 | .fireskills/CLAIMS.yml | 2026-09-25 | DECISION |
| K4 | Copy that exploits fear or guilt is not written. | L3 art. 37 para. 2 | fireskills/specialists/fireskill-specialist-copywriting/references/pattern-library.md | 2026-09-25 | DECISION |
| K5 | A disclosure that must exist (a relationship to the business, results not typical) is visible without interaction and in the language of the text it qualifies. | L1 (465.1(c)) | .fireskills/CLAIMS.yml | 2026-09-25 | DECISION |
| K6 | Structured data never carries a rating, review or price the page cannot back with a ledger record (`jsonld-no-unproven-rating`). | L4, L5 | scripts/seo-rules.ts | 2026-09-25 | CODE |
| K7 | Case-study results reported by copywriting authors are never turned into a claim about Nuxfire. | copy sources | fireskills/specialists/fireskill-specialist-copywriting/references/workflow-and-research.md | 2026-09-25 | DECISION |

## 3. The claim ledger (`.fireskills/CLAIMS.yml`)

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| G1 | Kinds of evidence a machine can check: `repo-count` (files, a regex and the exact count it must have), `repo-file` (a path, optionally containing a pattern), `url` (a primary source with a `retrieved` date), `owner-statement` (who states it and on which date). A claim without one of them does not pass. | scripts/copy-rules.ts | 2026-09-25 | CODE |
| G2 | `notClaims` lists a key whose number is not a claim (a version, a year) with the reason; `testimonials` holds a record per testimonial; `offers` holds the dated limit behind an urgency phrase. | .fireskills/CLAIMS.yml (header) | 2026-09-25 | CODE |
| G3 | The numbers of a claim's statement must appear in every locale text the claim backs (`claim-text-mismatch`), and each key it names must exist in a locale file (`ledger-invalid`): editing a sentence so it says something else than the record proves fails the gate. | scripts/copy-rules.ts | 2026-09-25 | CODE |
| G4 | Claims that exist today and cannot yet be proven are listed as dated allowances in `scripts/copy-baseline.json`, each owned by a backlog item that exists; the list can only shrink and no inline ignore exists. | scripts/copy-baseline.json, scripts/allowances.ts | 2026-09-25 | CODE |

## 4. How to write a ledger record

1. Find where the fact lives: a count of things in the repository (`repo-count`), a file that must
   exist (`repo-file`), a primary page (`url`, with today's date), or the owner (`owner-statement`).
2. Write the record with the exact statement, the locale keys it backs and the verifier.
3. Run `bun run check:copy`. A verifier that passes today and fails after the code changes is the
   point: the claim then stops being true and the gate says so.
4. If no verifier can be written, the claim is rewritten without the number or removed.

## 5. What this reference does NOT establish

- Which rules apply to the owner's business: consumer-protection rules differ by market, by
  customer type (a business buyer is not always a consumer) and by channel. Ask a lawyer.
- The rest of Annex I, 16 CFR 465 sections 465.7 and 465.8 (suppression, fake indicators of
  influence), and the rest of the CDC: not read here.
- Rules for other markets (the United Kingdom, Canada, Australia and others): not read.
- That the current landing text complies: 152 claims and one deadline phrase are baselined as
  unproven, the 8 testimonials are unverified and 11 image references are unregistered
  (`nuxfire-copy-delivery.md`).
