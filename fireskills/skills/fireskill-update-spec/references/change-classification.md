# Classifying a Specification Update

Read this reference when a request arrives after the spec has already obtained
`Definition Gate: Passed`.

| Class | Observable Signal | Action | Resumption |
| --- | --- | --- | --- |
| Internal fix | Does not change output, contract, data, risk, or acceptance | Do not edit spec; record in task evidence | `implement` |
| Editorial clarification | Same decision and same tests remain sufficient | Adjust wording without invalidating gates | Origin |
| Behavior change | Changes outcome, actor, scope, AC, FR, NFR, data, security, or interface | Update spec and reopen Act I | `validate` |
| Plan change | Keeps approved behavior, but changes solution, task, or TDD strategy | Update spec and reopen Act II | `tasks` |
| New slice | Has independent purpose, actors, or demonstrable delivery | Do not expand current spec; route to backlog or new spec | `backlog` or `specify` |
| Missing decision | Two plausible answers change behavior, risk, or tests | Ask one decision at a time | `backlog`, then `update-spec` |

## Decision Rules

- Classify by effect, not by words such as "small", "quick", or "just".
- Treat removal of approved behavior as a behavior change.
- Treat compatibility, privacy, authorization, and persistence as Act I.
- Treat library change without normative effect as Act II.
- When a change touches areas of different classes, use the earliest reopening point.
- When in doubt between editorial clarification and behavior change, reopen Act I.
- A new slice requires explicit intent before creating another spec.
