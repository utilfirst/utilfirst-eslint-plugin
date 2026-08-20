# Rule policy

The rule implementations in [`src/rules/`](../src/rules/) own accepted syntax and diagnostics. Their colocated tests own executable examples. This reference explains why each rule is universal policy, which boundary it protects, and what replacement a violation should produce.

Every exported rule is enabled at error severity by `configs.recommended`. Options adapt repository ownership or externally fixed signatures while leaving the rule enabled.

## Principles

- The plugin rejects recurring low-evidence patterns that erase type information, hide boundaries, fragment APIs, obscure ownership, or make failures unobservable.
- Rules are shared project policy for repositories that adopt this package. Their value is measured against that anti-slop contract rather than unrestricted JavaScript and TypeScript usage.
- Strong defaults keep the preferred form automatic. Narrow options preserve exact domain, framework, or external protocol contracts without weakening unrelated code.
- A legitimate exceptional use does not invalidate a rule. Use a documented option when the exception is stable and identifiable, or a reasoned lint suppression when the case is isolated.
- Tighten detection or add a bounded exception before considering removal. Remove a rule only when no enforceable universal contract can justify error severity.
- Implementations and colocated tests own accepted syntax and diagnostics. This document owns the policy rationale and expected replacement, so a rule review must consider both surfaces.

## Type evidence

- `no-chained-type-assertions` rejects nested assertions that discard one type and recreate another. Preserve the original precise type or validate untrusted input once before use. Chains containing only `as const` remain valid because they preserve literal evidence.
- `no-known-value-widening` rejects known values assigned, returned, or asserted into broad target types. Keep inference, use a named owner type, or use `satisfies` when a value needs contract checking without changing its inferred type. Explicit dictionary and generic-container annotations remain valid accumulator contracts for object literals.
- `no-widen-then-assert` rejects immutable local flows that erase a known value behind `unknown`, `object`, or a broad dictionary and later assert it back. Carry the precise type through the flow or parse boundary input once.
- `require-safety-comment-for-type-assertion` requires a nearby `SAFETY:` comment for every outermost non-const assertion. The comment records the runtime or framework-owned invariant that TypeScript cannot express, making each deliberate evidence override locally reviewable. Nested assertions receive one comment diagnostic while `no-chained-type-assertions` owns the chain itself.

## Boundary contracts

- `no-object-parameters` rejects the broad `object` type on function inputs, including local aliases that resolve to `object`. Accept a named owner type or a constrained generic.
- `no-unknown-parameters` keeps explicit `unknown` inputs at functions that return a decoded type and at the `cause` convention for error enrichment. Run an expected parser at the I/O boundary and pass its named output into other repository functions. `allowParameterNames` preserves externally fixed callback and interface signatures.
- `no-unknown-returns` rejects explicit `unknown` and `Promise<unknown>` return contracts, including local aliases. Parse before returning so callers receive a named domain type.
- `no-unknown-type-aliases` rejects aliases that only conceal `unknown`. Keep an intentionally open nested field visible in its owner type instead of naming the top type.
- `no-unsafe-dictionary-type` rejects dictionaries whose direct value contract is `unknown`, `any`, `object`, `{}`, or an equivalent union or alias. Use an owner-defined value type and parse external payloads before insertion.

## Object and API construction

- `no-conditional-undefined-properties` rejects object properties whose conditional value is `undefined`. Omit the property through a branched call or a typed local object so presence has one meaning.
- `no-enum-declarations` rejects repository-owned TypeScript enums, including const enums. Use literal unions or inferred constant objects. Ambient and declaration-file enums remain valid when a boundary requires them.
- `no-positional-boolean-parameters` rejects boolean flags on repository-owned named functions and methods. Use a named options object. `allowFunctionNames` preserves signatures fixed by an external protocol.
- `no-reflect-apply` rejects dynamic invocation through `Reflect.apply`. Call a typed function directly or place dynamic dispatch behind a named interface.
- `no-reflect-get` rejects dynamic reads through `Reflect.get`. Use typed property access or parse a dynamic value into a named contract before reading it.
- `prefer-options-parameter` rejects repository-owned named functions and methods with three or more inputs. Replace the positional inputs with one named options object. `allowFunctionNames` preserves signatures fixed by an external protocol.
- `prefer-switch-discriminator-chain` rejects four or more `if`/`else if` strict-equality branches on the same identifier. Replace the chain with a switch so the finite dispatch structure is explicit. Property access remains valid because repeated reads can differ from the switch's single read when a getter or proxy owns the property. Loose equality, mixed discriminators, non-literal comparisons, compound conditions, and range checks remain valid because a switch cannot preserve their contract mechanically.
- `prefer-top-level-function-declarations` rejects direct top-level arrow and function-expression bindings plus anonymous default-exported functions. Use a function declaration so stack frames, search, and hoisting identify the function's owner. Nested callbacks and functions passed through a wrapper remain valid because their containing call or function owns their role.

## Async errors

- `no-unhandled-detached-promises` defines `void call()` as the repository marker for detached asynchronous work and requires an observable rejection handler on that call chain. Add `.catch(...)` or pass a rejection callback as the second argument to `.then(...)`. Do not apply `void` to synchronous calls. The shared ESLint and Oxlint implementation enforces the marker syntax because Oxlint plugins do not expose TypeScript parser services.

## Lint policy

- `require-lint-suppression-reason` requires ESLint and Oxlint disable directives to include a non-empty reason after `--`. State the runtime, framework, or external boundary that forces the suppression.

## Ownership and tests

- `no-module-mocking` rejects Vitest and Jest mocks of repository-owned modules. Inject an unowned dependency through a production boundary and test with a real implementation or stateful fake. `internalModulePrefixes` marks package-style workspace imports as repository-owned.

## Layout

- [`consistent-blank-lines`](./rules/consistent-blank-lines.md) assigns tight, separate, or preserved gaps between statements and JSX children based on name flow, declaration families, control flow, hooks, comments, and line span. Its detailed specification owns the formatting contract and fixer behavior.
