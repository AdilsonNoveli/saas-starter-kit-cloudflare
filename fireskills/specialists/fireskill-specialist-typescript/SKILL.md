---
name: fireskill-specialist-typescript
description: Model and review robust TypeScript code with strictness, type narrowing, generics, modules, declarations, runtime schema validation, and public API contracts. Use for tsconfig, types, compilation errors, library declarations, or TS/JS contracts; use to eliminate unjustified any/assertions in modified files; do not use for framework-specific business logic (Nuxt, Vue) or confuse static types with runtime boundary validation — types do not replace runtime parsing.
---

# TypeScript

## When to Use

- Trigger when the task involves `tsconfig`, compilation errors, type modeling,
  generics, module resolution, or library `.d.ts` declarations.
- Trigger to review public TS/JS library APIs or to design validation for external data
  (network, disk, environment variables).
- Do not trigger for framework-specific business logic (Vue composables, page routing);
  combine with the framework specialist and use this specialist for the exposed type contracts.
- Combine with `$fireskill-specialist-web-api-design` when types model API schemas consumed by other services.

## Workflow

1. Read `tsconfig` (active strict flags), `package.json#type`, bundler and target runtimes,
   and the installed TypeScript version before proposing specific syntax or flags.
2. Identify untrusted boundaries in altered code (network payloads, files, environment variables,
   third-party responses) and types forming the module's public contract.
3. Model valid domain states using discriminated unions and type narrowing, eliminating
   impossible state combinations by design.
4. Let type inference operate internally; explicitly annotate only where contracts must
   remain stable (exported function signatures, public interfaces).
5. Eliminate unjustified `any`, `as`, and non-null assertions (`!`) in the modified code — each
   must carry a documented rationale or be replaced with proper narrowing.
6. Validate all external boundary data with a runtime schema before casting or treating as
   the expected type; static types do not prevent malformed payloads in production.
7. Run typecheck without emission (`tsc --noEmit`), tests, linter, and builds across all
   target environments (Node, browser, edge workers) before considering work complete.

## Core Rules

- Enable strict compiler flags supported by the project (`strict`, `strictNullChecks`,
  `noUncheckedIndexedAccess` when viable) and fix detected type errors rather than silencing them with casts.
- Prefer discriminated unions (`{ status: "ok"; data: T } | { status: "error"; error: E }`)
  over combinations of optional booleans and fields that permit impossible states (`{ loading: true; data: T; error: E }` simultaneously).
- Use `unknown` — never `any` — for unvalidated input at boundaries, and treat it as the
  expected type only after explicit narrowing or runtime parsing.
- Keep generics minimal: a type parameter is justified only when expressing a concrete
  relationship between two or more values (input and output, key and value); generics without relationships add unnecessary complexity.
- Prefer literal unions or `as const` objects over TypeScript `enum` when interoperability
  with plain JS or clean serialization is important — enums emit runtime code and have quirky comparison semantics.
- Separate `import type` from value imports, and adhere to project ESM/CJS module resolution
  settings (`moduleResolution`, `type` in `package.json`).
