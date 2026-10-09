# TypeScript Standards and References

## Modeling by Context

| Context | Recommended Approach |
| --- | --- |
| Finite states with fields varying per state | Discriminated union with literal discriminant field (`kind`/`status`/`type`) |
| Closed, predefined set of keys | `Record<K, V>` or mapped type over a literal union |
| Data from untrusted boundaries (network, disk, env) | Runtime schema (`zod`, `valibot`, etc.) producing validated types |
| Public extensible interface (`declare module`, merging) | `interface` |
| Internal type, union, tuple, or computed type | `type` alias |
| Invariants that must always hold (non-empty string, range) | Smart constructor / factory returning types only upon proven invariants, never casts |

## `strict` and Narrowing

- `strictNullChecks` is the cornerstone of strict mode: without it, `null` and `undefined`
  flow silently into every type.
- `noUncheckedIndexedAccess` adds `| undefined` to index access (`arr[i]`, `record[key]`) —
  enable when codebases can sustain narrowing overhead; it catches out-of-bounds indexing bugs.
- Type narrowing via `typeof`, `instanceof`, discriminant properties, or type predicates
  (`function isX(v: unknown): v is X`) is preferred over `as` assertions whenever inspectable at runtime.
- `unknown` is the only correct input type for untrusted boundary data; `any` turns off compiler
  type-checking downstream.

## `satisfies` vs Explicit Annotations vs Inference

| Goal | Tool |
| --- | --- |
| Let the compiler infer the narrowest type for internal values | No annotation — leverage inference |
| Validate value against a type while preserving narrowest literal type (route tables, design tokens) | `satisfies T` |
| Lock public API contracts to prevent unintended shifts when implementation changes | Explicit return annotation on exported signatures |
| Intentionally widen a literal to its base type | Explicit type annotation (`const x: T = {...}`) |

Using `const config = {...} satisfies Record<string, Route>` preserves exact literal keys
for autocomplete and narrowing, whereas `const config: Record<string, Route> = {...}` widens
all accesses to the generic `Route`. Use `satisfies` whenever consumers benefit from specific
literal types.

## Generics

- A type parameter is justified only when it connects two or more parts of the signature
  (e.g., input parameter to return type, key to value). Without this relationship, generics add pure friction.
- Prefer implicit `T extends unknown` over `T extends any`.
- Higher-order functions must infer generics from arguments (`function map<T, U>(arr: T[], fn: (x: T) => U): U[]`),
  never forcing callers to manually specify type arguments when inference suffices.

## Modules

- Use `import type { X }` for type-only imports — enables bundlers to elide imports completely
  and prevents circular runtime dependencies.
- Verify `"type": "module"` or `"commonjs"` in `package.json` and explicit extensions (`.js` in Node ESM)
  before assuming uniform library resolution across runtime targets.
- Dual-package libraries (ESM and CJS) must configure package `exports` with coherent conditions
  (`import`/`require`/`types`).

## Libraries and Public APIs

- Every exported function must have explicitly annotated parameter and return types.
- Generate and inspect emitted `.d.ts` declaration files — compiler config errors can emit
  broken types even when builds succeed.
- Public type changes that break downstream compilation constitute a SemVer major release,
  even if runtime JS remains untouched.

## Runtime Validation at Boundaries

- Static types vanish at runtime; incoming API payloads, configuration files, and environment
  variables must be parsed through runtime schemas before being trusted.
- Validation failures should be distinguishable from business logic errors, reporting the
  exact field path and offending value.

## Authoritative Documentation

- Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
- Modules: https://www.typescriptlang.org/docs/handbook/modules.html
- TSConfig Reference: https://www.typescriptlang.org/tsconfig/
- Declaration Files: https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html
- Do's and Don'ts: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Semantic Versioning: https://semver.org/
