# Choosing Test Levels

| Behavior | Preferred Level | Avoid |
| --- | --- | --- |
| Pure domain rules, transformations, validations | Unit | Spinning up servers or databases unnecessarily |
| Persistence, queues, cache, internal services | Integration | Mocking the very adapter being verified |
| HTTP contracts / external events | Contract or Integration | Relying on live production environments |
| Critical visible user journeys | Acceptance / E2E | Duplicating all domain logic in slow E2E flows |
| Performance, concurrency, resilience | Measurable specialized tests | Vague assertions that it "feels fast" |
| Layout or accessibility | DOM / accessibility and targeted E2E | Screenshots as sole uncalibrated evidence |

Use the lowest layer that conclusively observes specified behavior. An `AC` may span multiple levels when crossing boundaries, but each test must have a distinct purpose.
