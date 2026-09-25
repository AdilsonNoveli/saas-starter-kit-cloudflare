# Inbox: Plan setting: what happens to the buyer's team

| Metadata | Value |
| --- | --- |
| Status | Captured |
| Captured at | 2026-09-25T23:02:50Z |
| Slug | plan-setting-what-happens-to-the-buyer-s-team |
| Origin | User input |
| Processing | Initial analysis without questions |
| Discovery session | Standalone capture. |
| Conversation turn | Not applicable. |
| Original integrity | SHA-256 `4d2088578b42470b97db381d84d770e5d55551c0ad50a0def3affb4a0ac36286` |
| Derived backlog | None |
| Derived spec | None |

## Original Text

Cria a possibilidade de escolher esta opção no admin quando criar o plano: (a) o comprador ganha o próprio time novo, como dono; ou (b) o comprador entra num time já existente seu, por exemplo o de clientes ou suporte.

## Consulted Context

No contextual sources consulted.

## Processed Summary

**Inference:** When a platform admin creates or edits a plan, they choose whether a buyer gets a new team of their own (as Owner) or joins an existing team.

## Initial Analysis

### Problem or Opportunity

**Statement or identified inference:** The checkout that will follow the landing offer needs to know, per plan, where a buyer lands after paying. Nothing in the plan says it.

### Affected or Benefited People

**Statement or identified inference:** Platform admin (configures the plan); the buyer (lands in the team).

### Expected Result or Value

**Statement or identified inference:** The destination of a buyer is a plan decision made in the admin, not a constant in code.

### Signals of Scope, Rules, or Solution

**Extracted signals, not decisions:** Declaration: two options, chosen in the admin plan form. Inference: the existing-team option needs the admin to pick which team. Inference: this slice stores and edits the setting; the webhook and checkout that consume it belong to the checkout spec (SPEC-0003 Phase 7).

### Information That May Need Storage

**Signals to discuss later, not confirmation:** New columns on Plan: the mode and the target team (nullable, foreign key to Team).

### Risks and Dependencies

**Preliminary analysis:** Deleting the target team leaves the plan without a destination; the consumer must refuse to provision in that case. Depends on the checkout spec to have an effect.

## Possible Future Directions

**Hypotheses for backlog or spec, not requirements:** Fold into the checkout and provisioning spec; the role the buyer receives in an existing team is still to be decided.

## Points to Review in the Future

**To review:** Which role a buyer receives when joining an existing team (Member is the assumption, not confirmed). Whether the option also applies to free plans.

## Traceability

- Original formulation fully preserved in this capture.
- Analyses do not replace user decisions.
- Derived backlogs and specs must reference this file.

## Next Step

Keep in `specs/inbox/` or refine with `$fireskill-02-backlog`.
