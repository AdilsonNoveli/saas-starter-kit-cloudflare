# Discovery Map

Use only the areas that can materially affect the product or its verification.

| Area | High-Value Question |
| --- | --- |
| Problem | What observable pain point must cease to exist? |
| Actor | Who triggers the action and who receives the outcome? |
| Value | What result makes the first delivery useful on its own? |
| Scope | What seems related, but does NOT belong to this delivery? |
| Journey | What is the smallest complete flow from trigger to result? |
| Interface | Which screens, menus, targets, form fields, actions, and layouts fulfill the journey, and do actions open on a full page, slideover, modal, or other pattern? |
| Failures | What does the user see when inputs, dependencies, or permissions fail? |
| Data | What has identity, lifecycle, state, or retention requirements? |
| Security | Who can view or modify each data entity and what abuse vector matters? |
| Quality | What measurable limit of latency, throughput, availability, or access matters? |
| Integration | Which external service participates and how should its downtime be handled? |
| Technical | What constraint already exists in the repository that is not a new preference? |
| Acceptance | What demonstrable scenario proves each essential behavior? |

Prioritize by `impact × uncertainty`. Do not ask questions that direct codebase inspection easily resolves.
