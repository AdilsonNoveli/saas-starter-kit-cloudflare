# Pattern Library (original structures, classified)

A pattern is a **structure** with slots, not a sentence to copy. Each one names the reason it works,
the awareness stage it suits, and whether using it needs proof. Every example is written for this
project (a developer starter kit) in English, Brazilian Portuguese and Spanish, and is a
demonstration of the structure: the numbers, names and results in braces come from the claim
ledger `.fireskills/CLAIMS.yml`, never from this file.

## How this library was built, and its limits

- The owner supplied a folder of Portuguese template files (`docs/copywiter/`) as temporary local
  input, and later removed it from the machine. It was never committed. **This library was not
  extracted from those files**: they were no longer available when it was written. It is built from
  (1) the *names* of the mental triggers and component types that the material's analysis recorded
  (acceptance, authority, proof, curiosity, discovery, desire, difficulty, doubt, scarcity,
  expertise, ease, free, ways, fear, numbers, social proof, secret, time, transformation; and
  titles, calls, connectors, openings, guarantees, closings), (2) the structures the primary sources
  below describe, and (3) the compliance rules of `claims-and-compliance.md`.
- Consequence: the library is **smaller and more conservative than the material was**, and the
  originality check against the raw files (`scripts/copy-patterns.test.ts`) is skipped when the
  folder is absent. It says so when it runs. If the owner restores the folder, run the test again.
- The structures come from what the sources say: specific over vague, one central idea per block,
  clarity before intrigue, a headline that delivers what it promises, a call to value before the
  reader decided and a call to action after (Copyhackers, Copyblogger), and a value proposition that
  states who it is for and who it is not for (CXL). Results those authors report for their own
  clients are their case studies and are not used here as evidence of anything.

## Classes

| Class | Meaning | Rule |
| --- | --- | --- |
| A | No factual claim is needed to use it. | Write it freely; the words still go through the review of the workflow. |
| B | It states a number, a result, a comparison, a price, a guarantee, a person or a source. | It needs a record in `.fireskills/CLAIMS.yml` (a verifier the machine can run), or it does not ship. |
| C | Forbidden. | Described so nobody reinvents it; never shown with an example. |

Stages: `problem-aware` (the reader feels the problem, does not know the solution),
`solution-aware` (the reader knows solutions exist and compares), `any`.

## A. Patterns that need no proof

### P-001 Named outcome
- **Class**: A
- **Trigger**: specificity
- **Structure**: [audience] [verb] [one concrete thing they can name] without [the cost they know]
- **Stage**: problem-aware
- **Reason**: a named, concrete thing is easier to picture than a benefit word; it states one idea only.
- **Examples**:
  - en: Launch a multi-tenant SaaS without writing the auth layer
  - pt-br: Lance um SaaS multi-tenant sem escrever a camada de autenticação
  - es: Lanza un SaaS multi-tenant sin escribir la capa de autenticación

### P-002 Situation mirror
- **Class**: A
- **Trigger**: difficulty
- **Structure**: [the situation the reader is in, in words they would use] followed by [the honest cost of staying there]
- **Stage**: problem-aware
- **Reason**: it proves the writer understands the reader before asking for anything, and the cost is stated, not exaggerated.
- **Examples**:
  - en: Your prototype works, but every new customer means another week of plumbing.
  - pt-br: Seu protótipo funciona, mas cada novo cliente vira mais uma semana de encanamento.
  - es: Tu prototipo funciona, pero cada cliente nuevo significa otra semana de fontanería.

### P-003 Value proposition sentence
- **Class**: A
- **Trigger**: expertise
- **Structure**: For [buyer] who [problem], [product] is the [category] that [mechanism]. Unlike [alternative kind], it [difference the page can show].
- **Stage**: solution-aware
- **Reason**: it forces four decisions (who, what problem, what mechanism, what difference) in one sentence; the difference must be something the page then demonstrates.
- **Examples**:
  - en: For teams that ship B2B SaaS, Nuxfire is the starter kit that ships auth, billing and tenancy as separate layers you can read.
  - pt-br: Para times que entregam SaaS B2B, o Nuxfire é o starter kit que traz autenticação, cobrança e multi-tenancy como camadas separadas que você consegue ler.
  - es: Para equipos que lanzan SaaS B2B, Nuxfire es el starter kit que trae autenticación, facturación y multi-tenancy como capas separadas que puedes leer.

### P-004 Before and after
- **Class**: A
- **Trigger**: transformation
- **Structure**: From [the reader's current state] to [the state they want], through [the mechanism]
- **Stage**: solution-aware
- **Reason**: it puts the change, not the feature, first; the mechanism keeps it from being a wish.
- **Examples**:
  - en: From a folder of half-wired services to one app you can deploy, through layers that each own one job.
  - pt-br: De uma pasta de serviços pela metade para um app que você publica, com camadas que cuidam de uma coisa cada.
  - es: De una carpeta de servicios a medias a una app que puedes publicar, con capas que se ocupan de una sola cosa.

### P-005 Honest curiosity
- **Class**: A
- **Trigger**: curiosity
- **Structure**: [a specific, true detail of the product that reader would not expect], and what it means for [their job]
- **Stage**: problem-aware
- **Reason**: curiosity is earned only if the very next lines deliver the detail; a headline that withholds it is clickbait (P-024).
- **Examples**:
  - en: Why the billing layer does not know which payment provider you picked
  - pt-br: Por que a camada de cobrança não sabe qual provedor de pagamento você escolheu
  - es: Por qué la capa de facturación no sabe qué proveedor de pago elegiste

### P-006 Ways, listed
- **Class**: A
- **Trigger**: ways
- **Structure**: [the number of items that follow, equal to the list length] ways to [reach the outcome], each with [one line of how]
- **Stage**: problem-aware
- **Reason**: the reader can verify the count by counting; it is a promise about the page, not about the world.
- **Examples**:
  - en: Three ways to add a paid plan, and when each one fits
  - pt-br: Três jeitos de adicionar um plano pago, e quando cada um serve
  - es: Tres formas de añadir un plan de pago, y cuándo sirve cada una

### P-007 Smallest first step
- **Class**: A
- **Trigger**: ease
- **Structure**: Start with [one action the reader can do now]; [what happens next] follows from it
- **Stage**: solution-aware
- **Reason**: lowers the perceived size of the decision and matches a call to action to a single step.
- **Examples**:
  - en: Start with one command; the rest of the setup is a checklist you tick off.
  - pt-br: Comece com um comando; o resto da configuração é uma lista que você vai marcando.
  - es: Empieza con un comando; el resto de la configuración es una lista que vas marcando.

### P-008 Doubt, answered directly
- **Class**: A
- **Trigger**: doubt
- **Structure**: [the objection, in the reader's words]? [the direct answer in one sentence], then [where to check it]
- **Stage**: solution-aware
- **Reason**: it answers the hesitation the reader has, using the words they use; the answer points to something they can verify.
- **Examples**:
  - en: Worried about being locked in? The layers are plain TypeScript in your repository; read them before you decide.
  - pt-br: Receio de ficar preso? As camadas são TypeScript comum no seu repositório; leia antes de decidir.
  - es: ¿Te preocupa quedar atado? Las capas son TypeScript normal en tu repositorio; léelas antes de decidir.

### P-009 Call to value
- **Class**: A
- **Trigger**: discovery
- **Structure**: [verb of learning or seeing] [the outcome or the thing that makes it real]
- **Stage**: problem-aware
- **Reason**: a reader who has not decided is asked to look, not to commit (Copyhackers separates a call to value from a call to action).
- **Examples**:
  - en: See how a tenant is isolated
  - pt-br: Veja como um tenant fica isolado
  - es: Mira cómo se aísla un tenant

### P-010 Call to action
- **Class**: A
- **Trigger**: acceptance
- **Structure**: [verb] [the thing they get or do], with [what removes the friction]
- **Stage**: solution-aware
- **Reason**: after the reader decided, the button names the action and the cost of taking it; nothing new is promised.
- **Examples**:
  - en: Get the starter kit
  - pt-br: Baixar o starter kit
  - es: Obtener el starter kit

### P-011 Who it is not for
- **Class**: A
- **Trigger**: specificity
- **Structure**: This is not for [reader who would be disappointed], because [reason]; it is for [reader who fits]
- **Stage**: solution-aware
- **Reason**: a boundary makes the rest of the page more believable and saves the wrong reader's time (CXL asks a value proposition to say who it is not for).
- **Examples**:
  - en: It is not a no-code tool: you will edit TypeScript, and that is the point.
  - pt-br: Não é uma ferramenta no-code: você vai editar TypeScript, e é isso que se quer.
  - es: No es una herramienta no-code: vas a editar TypeScript, y esa es la idea.

### P-012 Connector between claims
- **Class**: A
- **Trigger**: discovery
- **Structure**: [the previous point in five words], so [the consequence the next block explains]
- **Stage**: any
- **Reason**: the messaging hierarchy is the order in which the page convinces; a connector states why the next block is next.
- **Examples**:
  - en: The billing layer is separate, so changing providers touches one folder.
  - pt-br: A cobrança é uma camada separada, então trocar de provedor mexe em uma pasta só.
  - es: La facturación es una capa separada, así que cambiar de proveedor toca una sola carpeta.

## B. Patterns that need a ledger entry

### P-013 Number with its unit
- **Class**: B
- **Trigger**: numbers
- **Structure**: {count} [thing that can be counted in the repository] that [what it does for the reader]
- **Stage**: solution-aware
- **Reason**: a specific number is persuasive because it can be checked, and it can only be checked if a verifier exists (`repo-count`).
- **Examples**:
  - en: {tables} tables, each scoped to a tenant
  - pt-br: {tables} tabelas, cada uma isolada por tenant
  - es: {tables} tablas, cada una aislada por tenant

### P-014 Named customer, with consent
- **Class**: B
- **Trigger**: social proof
- **Structure**: "[the customer's own sentence about a specific thing]" followed by [their real name, role and company]
- **Stage**: solution-aware
- **Reason**: proof from a person like the reader works because the person exists; the record holds their consent, their use of the product and their own photo (16 CFR 465.2).
- **Examples**:
  - en: "{quote}" — {name}, {role} at {company}
  - pt-br: "{quote}" — {name}, {role} na {company}
  - es: "{quote}" — {name}, {role} en {company}

### P-015 Cited authority
- **Class**: B
- **Trigger**: authority
- **Structure**: [what a named, checkable source says] about [the point], with [the source's name and where to read it]
- **Stage**: solution-aware
- **Reason**: authority borrows trust only when the source is real and the reader can open it (`url` verifier with a retrieved date).
- **Examples**:
  - en: Cloudflare documents {behavior}; here is the page.
  - pt-br: A Cloudflare documenta {behavior}; aqui está a página.
  - es: Cloudflare documenta {behavior}; aquí está la página.

### P-016 Measured time to result
- **Class**: B
- **Trigger**: time
- **Structure**: [the outcome] in {duration}, measured [how and when]
- **Stage**: solution-aware
- **Reason**: a duration is only honest if somebody timed it; the measurement is part of the sentence.
- **Examples**:
  - en: From clone to a running local app in {minutes} minutes, timed on {date}
  - pt-br: Do clone ao app rodando local em {minutes} minutos, cronometrado em {date}
  - es: Del clon a la app corriendo en local en {minutes} minutos, medido el {date}

### P-017 Stated price and what it includes
- **Class**: B
- **Trigger**: free
- **Structure**: [price or "free"] for [exactly what is included], [what is not]
- **Stage**: solution-aware
- **Reason**: a price statement is a claim about billing: it is verified against the billing configuration, not against the copy.
- **Examples**:
  - en: {price} once, for the full source and {support}; hosting is yours
  - pt-br: {price} uma vez, com o código completo e {support}; a hospedagem é sua
  - es: {price} una vez, con el código completo y {support}; el hosting es tuyo

### P-018 Comparison with a named alternative
- **Class**: B
- **Trigger**: expertise
- **Structure**: [the named alternative] does [what it does]; [the product] does [the different thing], which matters when [the reader's case]
- **Stage**: solution-aware
- **Reason**: a comparison is a claim about someone else's product: it needs a dated source for each side and states the case where the alternative is the better choice.
- **Examples**:
  - en: {alternative} gives you {what}; this gives you {what}, which matters when you must own the code.
  - pt-br: {alternative} entrega {what}; este entrega {what}, o que importa quando você precisa ser dono do código.
  - es: {alternative} te da {what}; este te da {what}, lo que importa cuando debes ser dueño del código.

### P-019 Guarantee that exists
- **Class**: B
- **Trigger**: acceptance
- **Structure**: [the exact terms of the refund or support promise] for [how long], stated where the reader decides
- **Stage**: solution-aware
- **Reason**: a guarantee removes risk only if its terms are the real ones; the terms are copied from the policy the owner states.
- **Examples**:
  - en: {days}-day refund, no questions, under the terms on the refund page
  - pt-br: Reembolso em {days} dias, sem perguntas, nos termos da página de reembolso
  - es: Reembolso en {days} días, sin preguntas, según los términos de la página de reembolsos

## C. Forbidden patterns (described, never demonstrated)

### P-020 Invented scarcity
- **Class**: C
- **Trigger**: scarcity
- **Structure**: a deadline, a countdown or a number of remaining places that does not correspond to a real, enforced limit
- **Stage**: any
- **Reason**: falsely saying an offer is available for a very limited time, to press a decision, is unfair in all circumstances in the EU (Directive 2005/29/EC, Annex I, item 7). A real, dated limit is a ledger `offers` record and is written from it.
- **Examples**: none, forbidden

### P-021 Invented proof
- **Class**: C
- **Trigger**: social proof
- **Structure**: a customer count, a rating, a logo wall or a testimonial that no record supports, or a photo reused for a different person
- **Stage**: any
- **Reason**: a review or testimonial that misrepresents that the person exists, used the product or had the experience is prohibited in the US (16 CFR 465.2), and the advertiser must hold the evidence for the message (Brazilian CDC, arts. 36 and 38).
- **Examples**: none, forbidden

### P-022 Fear and guilt
- **Class**: C
- **Trigger**: fear
- **Structure**: a hook that frightens or shames the reader into acting, or that mocks the reader they are addressing
- **Stage**: any
- **Reason**: advertising that exploits fear is abusive under the Brazilian CDC (art. 37, para. 2); the same tone breaks the trust every other pattern builds.
- **Examples**: none, forbidden

### P-023 Unsupported promise of result
- **Class**: C
- **Trigger**: transformation
- **Structure**: a promised income, growth, ranking, revenue or time saving for the reader that the writer cannot show
- **Stage**: any
- **Reason**: information capable of inducing error about what the product delivers is misleading advertising (Brazilian CDC, art. 37) and a warning sign for Google (promising what is not delivered). Say what the product does; describe results only through a ledger record.
- **Examples**: none, forbidden

### P-024 Clickbait
- **Class**: C
- **Trigger**: curiosity
- **Structure**: a headline or a title that promises a reveal and the page does not deliver it, or that exaggerates
- **Stage**: any
- **Reason**: Copyblogger asks that a headline delivers what it promises, and Google asks that a title describes the content and avoids exaggeration or shock.
- **Examples**: none, forbidden
