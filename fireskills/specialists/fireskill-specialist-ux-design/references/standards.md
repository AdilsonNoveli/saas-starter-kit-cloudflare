# UX Research and Experience Design Standards

<!-- markdownlint-disable MD013 -->

## Selecting Methods by Research Question

| Question | Initial Method | Produced Evidence |
| --- | --- | --- |
| How does the task occur today? | Contextual inquiry + direct observation | Actual behaviors, environmental context, and workarounds |
| Can users find and label content? | Card sorting / Tree testing | Taxonomy groupings, nomenclature, and search paths |
| Can the workflow be completed? | Moderated or unmoderated usability testing | Task success, error points, hesitation, and comprehension |
| Which variant performs better at scale? | Controlled A/B experiment | Statistically significant causal behavioral differences |
| What issues are recurring repeatedly? | Customer support tickets + product analytics | Problem frequency, funnel drop-off steps, user segments |
| Does the proposal communicate core value? | Task-oriented prototype testing | Mental model interpretation and action intent |

Never choose interviews to confirm behaviors that can be observed directly, nor controlled
experiments for solutions whose basic operational usability has not yet been established.

## Minimum Research Plan

1. Decision the study directly informs.
2. Core hypothesis and evidence capable of refuting it.
3. Target audience, recruitment criteria, and exclusion rules.
4. Methodology, scenario tasks, interview guide, and pilot run.
5. Participant consent, recording storage, access control, retention, and data anonymization.
6. Observable signals and severity classification criteria.
7. Study limitations and stopping conditions.

Questions must elicit specific past episodes and decisions, not hypotheticals or
validation of the designer's solution. During task testing, employ neutral non-directive
prompts and never demonstrate the expected path.

## Quality of Evidence

- **Observation:** Concrete recorded behavior, spoken quote, or artifact artifact.
- **Interpretation:** Plausible explanation grounded in the observation.
- **Finding:** A recurring pattern supported by related observations.
- **Recommendation:** Actionable design change proposed to address the finding.
- **Open Question:** Residual uncertainty requiring further experimentation or decisions.

Keep these layers distinct in syntheses. A recommendation without a finding is opinion;
a finding without raw observation is ungrounded memory.

Classify severity combining task impact, observed frequency, recoverability, and
domain risk. Avoid converting small qualitative cohorts into false population percentages.

## User Journeys and Service Design

Map thoroughly:

- User triggers, core objectives, and completion criteria.
- Channels, devices, and context shifts.
- Steps, decision forks, wait times, and external dependencies.
- Required inputs, paperwork, or credentials.
- Failure states, error recovery paths, customer support, and human handoffs.
- Internal operational owners and operational evidence per step.

Optimize the complete end-to-end service, not just screen layouts. A concise form
that transfers manual workload onto customer support degrades the broader experience.

## Forms and Content Design

- Request only what is strictly necessary for the current decision, explaining reasons
  for sensitive or unexpected inputs.
- Use one question per page when doing so improves focus and error recovery; group fields
  when comparative context or concurrent completion is essential.
- Preserve inputs across validation errors, associate error messages directly with fields,
  and provide an error summary when multiple issues exist.
- Label actions by outcome (`Save address`), not abstract mechanisms (`Continue`),
  whenever clarity of consequence is required.
- Clearly distinguish optional fields, formatting examples, and mandatory system constraints.

## Onboarding

- Define the user's first observable "aha!" value moment and guide directly toward it.
- Request permissions and account configuration at the moment of actual usage.
- Allow users to bypass instructional walkthroughs that do not block task completion.
- Preserve user progress and offer clear resume paths.
- Measure task completion and activation rates, not the volume of carousel cards swiped.

## Validation Proof

- Participants strictly adhere to recruitment criteria, with deviations documented.
- Scenario tasks omit control names or instructions revealing the ideal path.
- Independent completions, assisted successes, errors, and drop-offs are tracked separately.
- Consented recordings and verbatim field notes substantiate every reported finding.
- Limitations of sample size, test environment, and prototype fidelity are clearly documented.
- Follow-up evaluations utilize comparable critical tasks after design modifications.

<!-- markdownlint-enable MD013 -->

## Primary and Consolidated Sources

<!-- markdownlint-disable MD034 -->

- ISO 9241-210 (Human-centred design for interactive systems): https://www.iso.org/standard/77520.html
- W3C Cognitive Accessibility Guidance: https://www.w3.org/TR/coga-usable/
- GOV.UK Service Manual: https://www.gov.uk/service-manual
- GOV.UK Design System patterns: https://design-system.service.gov.uk/patterns/
- USWDS Design Principles: https://designsystem.digital.gov/design-principles/
- Nielsen Norman Group 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/

<!-- markdownlint-enable MD034 -->
