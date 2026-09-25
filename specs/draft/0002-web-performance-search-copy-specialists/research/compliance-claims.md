# Claims, testimonials and urgency: what the primary texts say

This is a summary of what the texts say, for engineering rules. It is **not legal advice**; the
owner must confirm the rules that apply to their markets with a lawyer. Jurisdictions were chosen
because the product is sold in English, Portuguese (Brazil) and Spanish and the payment flow is
international; that scope is an assumption to confirm (open question Q-03).

## L1. United States — 16 CFR Part 465 (mode RAW, eCFR, up to date as of 2026-09-23)

https://www.ecfr.gov/current/title-16/part-465 ("Rule on the Use of Consumer Reviews and
Testimonials"; source 89 FR 68077, 2024-08-22).

- 465.2: it is an unfair or deceptive practice for a business to write, create or sell a consumer
  review, consumer testimonial or celebrity testimonial that materially misrepresents that the
  reviewer exists, that they used the product, or their experience; and to disseminate one the
  business knew or should have known was misrepresenting those points.
- 465.4: no compensation or incentive conditioned on a particular sentiment of a review.
- 465.5: officers, managers or agents writing reviews or testimonials must disclose their
  relationship clearly and conspicuously unless it is otherwise clear.
- 465.1(c)(4)-(5): a disclosure on the internet must be unavoidable (not behind a click or hover)
  and must appear in each language in which the representation appears.
- Not read in this session: 465.7 (suppression), 465.8 (fake indicators of influence) beyond the
  definitions.

## L2. European Union — Directive 2005/29/EC (mode RAW, EUR-Lex)

https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32005L0029 — Annex I, point 7:
falsely stating that a product will only be available for a very limited time, or on particular
terms for a very limited time, to elicit an immediate decision and deprive consumers of enough
time to make an informed choice. Annex I lists practices considered unfair in all circumstances.
(Only this item was read; the rest of the Annex was not.)

## L3. Brazil — Código de Defesa do Consumidor, Lei 8.078/1990 (mode RAW, Planalto)

https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm

- Art. 36, sole paragraph: the supplier keeps, for those interested, the factual, technical and
  scientific data that support the advertising message.
- Art. 37: misleading or abusive advertising is prohibited; misleading covers information wholly
  or partly false or capable of inducing error about nature, characteristics, quality, quantity,
  properties, origin, price and other data, including by omission (§1, §3); abusive includes
  advertising that exploits fear or superstition (§2).
- Art. 38: the burden of proving the truth and correctness of the advertising information lies with
  the sponsor.

## Engineering consequences (derived)

| Rule | Basis |
| --- | --- |
| Every factual claim on a page (a number, a superlative, a comparison, a guarantee, a result, "zero", "100 %", "millions") has a **ledger entry** holding its evidence, so the proof exists before the question is asked. | L3 Art. 36 sole paragraph and Art. 38; Google G1 ("factual claims verifiable"), Bing B10/B16 |
| Testimonials exist only if the person exists, used the product, and consented; each is a ledger record with provenance; photos are not reused for different people. | L1 465.2; Bing B16 (misleading content) |
| A countdown, "only today", "last spots" or a price deadline exists only if a real, dated, enforced limit exists in the billing configuration; the copy reads the limit from that source. | L2 Annex I(7); Google G2 |
| Copy that exploits fear is not written. | L3 Art. 37 §2 |
| A disclosure that must exist (relationship to the business, results not typical) is visible without interaction and in the language of the text it qualifies. | L1 465.1(c)(4)-(5) |
