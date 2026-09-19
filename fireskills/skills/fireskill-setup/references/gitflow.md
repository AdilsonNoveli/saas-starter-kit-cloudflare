# On-Demand Branch Specialist

Setup does not pick a branch model proactively. Existing `git branch -a`, a branch named `develop`, or any other repository signal never authorizes assuming Gitflow. The choice of branch model belongs strictly to the person guiding the project.

- Load `$fireskill-specialist-gitflow` only when the user explicitly requests Gitflow in conversation, or when `RULES.md` records this decision from a prior task.
- Upon loading, record confirmed conventions (permanent branches, prefixes for `feature/`, `release/`, `hotfix/`, and merge policy) into `.fireskills/RULES.md` via `$fireskill-aux-rules`, so setup does not need to inquire again.
- If the user makes no mention of Gitflow, proceed normally without declared branch models. The absence of mention is not a gap to resolve through inference.

The specialist resides in `fireskills/specialists/fireskill-specialist-gitflow/`.
Announce automatic transition and load it within the same conversation.
