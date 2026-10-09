# Pattern Library (original structures, classified)

A pattern is a **structure** with slots, not a sentence to copy. Each one names the reason it works,
the awareness stage it suits, and whether using it needs proof. Every example is written for this
project (a developer starter kit) in English, Brazilian Portuguese and Spanish, and is a
demonstration of the structure: the numbers, names and results in braces come from the claim
ledger `.fireskills/CLAIMS.yml`, never from this file.

## How this library was built, and its limits

- **Source material.** The owner supplied a folder of 37 Portuguese template files (`docs/copywiter/`,
  about 54,000 words). It stays local and is never committed (`scripts/copy-patterns.test.ts` checks
  that git tracks none of it). It was read in full on 2026-09-25: 19 trigger files with fill-in-the-blank
  headlines, component libraries (titles, calls, openings, connectors, closings, guarantees,
  postscripts, subtitles), email sequences and chat scripts.
- **What the material is.** Mass-market direct response for health, income and dating offers,
  translated from older sales letters. Its structures are useful; its wording, its promises and
  many of its tactics are not. Each pattern below keeps a **structure**, written in this project's
  words, for a developer product.
- **What was kept, by group** (P-numbers are the patterns below):

| Group in the material | Kept as |
| --- | --- |
| Acceptance, difficulty, doubt, desire, "almost" | P-002, P-033, P-035, P-029 |
| Authority, expertise | P-015, P-026, P-011 |
| Proof, numbers, social proof | P-013, P-014, P-016 |
| Curiosity, discovery, secret | P-005, P-032 (kept without the hype; the hype is P-043) |
| Ease, ways, "X without Y" | P-006, P-007, P-025, P-027, P-034 |
| Fear, mistakes, warning signs | P-030, P-031 (the useful half; the threatening half is P-022) |
| Free, price, guarantees | P-017, P-019 (P-044 forbids the earnings-multiple guarantee) |
| Time, scarcity | P-016, P-036 (real deadline), P-020 (invented one, forbidden) |
| Transformation | P-004 |
| Openings, connectors, closings, postscripts | P-012, P-040, P-010, P-009 |
| Email sequences | P-038 (recovery), P-039 (event invitation) |
| Chat scripts | P-037 (qualifying conversation) |

- **What was left out on purpose**, and why: income, weight-loss and disease promises (P-023);
  invented urgency and countdowns (P-020); invented customer stories and counts (P-021); fear and
  guilt closings and the "generous contribution" pressure (P-022); covert-suggestion connectors
  (P-041); the earnings-multiple guarantees (P-044); scripts that promote a third party's affiliate
  programme, whose redistribution rights are unknown.
- **Language.** The examples in the material depend on Portuguese sentence shapes (tag questions such
  as "..., certo?", stacked "Sem ... e sem ..." clauses). Here each pattern is re-built for English,
  Portuguese and Spanish (transcreation), not translated.
- **Originality.** No example shares a run of 8 identical words with any file of the folder; the test
  `scripts/copy-patterns.test.ts` checks it whenever the folder is present, and it ran with the folder
  present on 2026-09-25 (all passed). Because the library is written in English and Spanish as well
  as Portuguese, this is a strict check of wording, not only of structure.
- **The folder can be deleted** once this library is committed: nothing else in the repository reads
  it (the originality test skips itself and says so when the folder is absent).
- The structures also follow what the primary sources say: specific over vague, one central idea per
  block, clarity before intrigue, a headline that delivers what it promises, a call to value before
  the reader decided and a call to action after (Copyhackers, Copyblogger), and a value proposition
  that states who it is for and who it is not for (CXL). Results those authors report for their own
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

### P-026 Audience call-out
- **Class**: A
- **Trigger**: expertise
- **Structure**: For [the reader who fits, named by what they do or need], [where to start]
- **Stage**: problem-aware
- **Reason**: a reader who recognises themselves keeps reading, and one who does not leaves without cost; naming the audience is the cheapest form of specificity.
- **Examples**:
  - en: For teams that already have a Nuxt app and now need billing: start here.
  - pt-br: Para times que já têm um app Nuxt e agora precisam de cobrança: comece por aqui.
  - es: Para equipos que ya tienen una app Nuxt y ahora necesitan facturación: empieza aquí.

### P-028 What to do and what not to do
- **Class**: A
- **Trigger**: expertise
- **Structure**: [Topic]: what to do, and what to avoid, each in one line with the reason
- **Stage**: solution-aware
- **Reason**: a paired list teaches by contrast and is easy to scan; every line has to be true and checkable by the reader.
- **Examples**:
  - en: Webhooks: what to do and what to avoid
  - pt-br: Webhooks: o que fazer e o que evitar
  - es: Webhooks: qué hacer y qué evitar

### P-029 Self-check question
- **Class**: A
- **Trigger**: doubt
- **Structure**: Are you [doing the thing] the right way? [The checks that answer it]
- **Stage**: problem-aware
- **Reason**: a question the reader can answer for themselves invites them into the text, as long as the checks that follow really answer it.
- **Examples**:
  - en: Is your tenant isolation really enforced? Five checks you can run today.
  - pt-br: O isolamento dos seus tenants está mesmo garantido? Cinco verificações que você roda hoje.
  - es: ¿El aislamiento de tus tenants está realmente garantizado? Cinco comprobaciones que puedes hacer hoy.

### P-030 Common mistakes
- **Class**: A
- **Trigger**: fear
- **Structure**: [The number of items listed] mistakes teams make when [doing the thing], and how to avoid each one
- **Stage**: problem-aware
- **Reason**: naming an error the reader can still avoid is useful, not frightening; the fear pattern is the one that threatens a loss without offering a way out (P-022).
- **Examples**:
  - en: Four mistakes teams make when they add a second tenant, and how to avoid each
  - pt-br: Quatro erros que times cometem ao adicionar o segundo tenant, e como evitar cada um
  - es: Cuatro errores que cometen los equipos al añadir el segundo tenant, y cómo evitar cada uno

### P-031 Warning signs
- **Class**: A
- **Trigger**: fear
- **Structure**: [The number listed] signs that [the thing] is about to cause trouble, and what each one means
- **Stage**: problem-aware
- **Reason**: a list of observable symptoms lets the reader diagnose their own case; each sign needs to be something they can actually see.
- **Examples**:
  - en: Three signs your migrations are drifting from your schema
  - pt-br: Três sinais de que suas migrations estão se afastando do schema
  - es: Tres señales de que tus migraciones se están alejando del schema

### P-032 Which kind are you
- **Class**: A
- **Trigger**: discovery
- **Structure**: [The number of kinds listed] kinds of [thing the reader is or has]. Which one is yours?
- **Stage**: problem-aware
- **Reason**: a typology gives the reader a way to place themselves; when there is a quiz, it has to exist and work.
- **Examples**:
  - en: Three kinds of SaaS starting points. Which one is yours?
  - pt-br: Três tipos de ponto de partida para um SaaS. Qual é o seu?
  - es: Tres tipos de punto de partida para un SaaS. ¿Cuál es el tuyo?

### P-033 Imagine the outcome as a question
- **Class**: A
- **Trigger**: desire
- **Structure**: How would [the reader's work] change if [the outcome] were already done?
- **Stage**: problem-aware
- **Reason**: a question about the desired state asks the reader to picture it without asserting that the product delivers it; the next block has to show how.
- **Examples**:
  - en: How would your week change if billing were already done and tested?
  - pt-br: Como seria a sua semana se a cobrança já estivesse pronta e testada?
  - es: ¿Cómo cambiaría tu semana si la facturación ya estuviera hecha y probada?

### P-034 Guide framing
- **Class**: A
- **Trigger**: ease
- **Structure**: [Topic]: what to know before [the step the reader is about to take], in the order you will meet it
- **Stage**: solution-aware
- **Reason**: promising a guide, and only what comes before a named step, keeps the promise small enough to keep ("everything" and "complete" are claims and are avoided).
- **Examples**:
  - en: Deploying to Cloudflare: what to know before your first release
  - pt-br: Publicar na Cloudflare: o que saber antes da sua primeira versão
  - es: Publicar en Cloudflare: qué saber antes de tu primera versión

### P-035 Almost there
- **Class**: A
- **Trigger**: acceptance
- **Structure**: Why do some [teams] stay at "almost [the milestone]"? [The one cause the page then explains]
- **Stage**: problem-aware
- **Reason**: it names a common, unglamorous state and turns it into a question with an answer; the cause has to be real and shown.
- **Examples**:
  - en: Why do some projects stay at "almost launched"? Usually it is the last 10 percent of plumbing.
  - pt-br: Por que alguns projetos ficam no "quase publicado"? Costuma ser o último trecho de encanamento.
  - es: ¿Por qué algunos proyectos se quedan en el "casi lanzado"? Suele ser el último tramo de fontanería.

### P-037 Qualifying conversation
- **Class**: A
- **Trigger**: specificity
- **Structure**: Ask permission to explain; offer two or three answer buttons; reflect the answer back; then say only what is relevant to it
- **Stage**: problem-aware
- **Reason**: in a chat or an onboarding flow each answer narrows what to say next, and the reader is never handed a monologue; the reflection proves the answer was heard.
- **Examples**:
  - en: Can I ask two quick questions so I show you the right part? [Yes] [Not now]
  - pt-br: Posso fazer duas perguntas rápidas para mostrar a parte certa? [Sim] [Agora não]
  - es: ¿Puedo hacerte dos preguntas rápidas para mostrarte la parte correcta? [Sí] [Ahora no]

### P-038 Recovery message after an unfinished step
- **Class**: A
- **Trigger**: ease
- **Structure**: Subject names the step; body: what was left unfinished, "did something go wrong?", one link to continue, one way to get help
- **Stage**: solution-aware
- **Reason**: a message about something the person started is useful, not pushy, when it asks what happened, offers one way back and does not invent a deadline.
- **Examples**:
  - en: About your workspace setup. It looks unfinished: did something get in the way? You can pick up here, or reply and we will help.
  - pt-br: Sobre a configuração do seu workspace. Parece que ficou pela metade: algo atrapalhou? Você retoma por aqui, ou responda e nós ajudamos.
  - es: Sobre la configuración de tu workspace. Parece que quedó a medias: ¿algo lo impidió? Puedes retomarlo aquí, o responde y te ayudamos.

### P-040 Postscript that repeats one thing
- **Class**: A
- **Trigger**: acceptance
- **Structure**: P.S. [the one point that decides for most readers, said again in a new way], [the single next step]
- **Stage**: solution-aware
- **Reason**: many readers jump to the end of a message, so the last lines carry the point that matters most; it adds nothing new to be proven.
- **Examples**:
  - en: P.S. The source is yours to read before you decide. Start with the layers folder.
  - pt-br: P.S. O código é seu para ler antes de decidir. Comece pela pasta layers.
  - es: P.S. El código es tuyo para leer antes de decidir. Empieza por la carpeta layers.

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

### P-025 Absence claim
- **Class**: B
- **Trigger**: ease
- **Structure**: {outcome} without {the cost or step the reader dreads}, because [the mechanism that makes it true]
- **Stage**: solution-aware
- **Reason**: "X without Y" is the most common structure in direct-response headlines and it is a claim about the world; it holds only if the mechanism is shown and a record backs it.
- **Examples**:
  - en: {outcome} without {cost}, because {mechanism}
  - pt-br: {outcome} sem {cost}, porque {mechanism}
  - es: {outcome} sin {cost}, porque {mechanism}

### P-027 Barrier removal
- **Class**: B
- **Trigger**: specificity
- **Structure**: You do not need [the requirement the reader assumes] to [do the thing]; you need [what is actually needed]
- **Stage**: problem-aware
- **Reason**: it answers a silent objection, and it is a claim that the requirement is absent, so the prerequisites of the product must say the same thing.
- **Examples**:
  - en: You do not need a DevOps hire to deploy this; you need {prerequisite}.
  - pt-br: Você não precisa de um profissional de DevOps para publicar isto; precisa de {prerequisite}.
  - es: No necesitas un perfil de DevOps para publicar esto; necesitas {prerequisite}.

### P-036 Real deadline
- **Class**: B
- **Trigger**: scarcity
- **Structure**: [What ends] on {date}; after it, [exactly what changes]
- **Stage**: solution-aware
- **Reason**: a limit is honest when it is real, dated and enforced by the billing configuration, and stating what changes afterwards lets the reader decide; the date comes from the ledger `offers` record (P-020 is the forbidden version).
- **Examples**:
  - en: The launch price ends on {date}; after it the price is {price}.
  - pt-br: O preço de lançamento termina em {date}; depois o preço é {price}.
  - es: El precio de lanzamiento termina el {date}; después el precio es {price}.

### P-039 Event invitation
- **Class**: B
- **Trigger**: discovery
- **Structure**: [The reader's wish, as a question]. On {date} at {time} we will [what the session covers]; the link is [where it is shared]
- **Stage**: problem-aware
- **Reason**: an invitation is a promise about a real event: the date, the time and the content are facts recorded before the message is sent.
- **Examples**:
  - en: Want to see a tenant isolated end to end? On {date} at {time} we walk through it live; the link is in the reply.
  - pt-br: Quer ver um tenant isolado de ponta a ponta? Em {date}, às {time}, mostramos ao vivo; o link vem na resposta.
  - es: ¿Quieres ver un tenant aislado de punta a punta? El {date} a las {time} lo mostramos en directo; el enlace llega en la respuesta.

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

### P-041 Covert suggestion
- **Class**: C
- **Trigger**: acceptance
- **Structure**: language meant to slip a belief or a feeling into the reader without their noticing ("as these words settle in your mind you will start to feel...")
- **Stage**: any
- **Reason**: it works by bypassing the reader's judgement, which is the opposite of an honest claim with proof; it belongs to no page a buyer will rely on, and the connector lists in the owner's material that lean on it are not used.
- **Examples**: none, forbidden

### P-042 Invented popularity
- **Class**: C
- **Trigger**: social proof
- **Structure**: "Everyone is talking about X" or "why everyone wants to know about X" without a source that shows it
- **Stage**: any
- **Reason**: an unsupported claim of wide interest is a claim about the market that nobody can check (Brazilian CDC, art. 37 and 38); real interest is shown with a number and a source (P-013).
- **Examples**: none, forbidden

### P-043 Fake secrecy
- **Class**: C
- **Trigger**: secret
- **Structure**: "the secret they do not want you to know", "never before revealed", "unknown method" for something that is public or ordinary
- **Stage**: any
- **Reason**: it presents ordinary information as hidden to raise its value; a specific, true detail that the reader would not expect is the honest form (P-005).
- **Examples**: none, forbidden

### P-044 Guarantee pegged to earnings
- **Class**: C
- **Trigger**: guarantee
- **Structure**: a refund that depends on the reader earning a multiple of the price, or a promise phrased as a multiple of what they pay
- **Stage**: any
- **Reason**: it promises an income outcome the seller does not control (P-023) and makes the refund conditional on it; a real guarantee states its terms plainly (P-019).
- **Examples**: none, forbidden
