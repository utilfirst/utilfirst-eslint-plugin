# Rule policy

The rule implementations in [`src/rules/`](../src/rules/) own accepted syntax and diagnostics. Their colocated tests own executable examples. This reference explains why each rule is universal policy, which boundary it protects, and what replacement a violation should produce.

Every exported rule is enabled at error severity by `configs.recommended`. Options adapt repository ownership or externally fixed signatures while leaving the rule enabled.

## Type evidence

- `no-chained-type-assertions` rejects nested assertions that discard one type and recreate another. Preserve the original precise type or validate untrusted input once before use. Chains containing only `as const` remain valid because they preserve literal evidence.
- `no-known-value-widening` rejects known values assigned, returned, or asserted into broad target types. Keep inference, use a named owner type, or use `satisfies` when a value needs contract checking without changing its inferred type.
- `no-widen-then-assert` rejects immutable local flows that erase a known value behind `unknown`, `object`, or a broad dictionary and later assert it back. Carry the precise type through the flow or parse boundary input once.
- `require-safety-comment-for-type-assertion` requires a nearby `SAFETY:` comment for every non-const assertion. The comment must state the runtime or framework-owned invariant that TypeScript cannot express.

## Boundary contracts

- `no-object-parameters` rejects the broad `object` type on function inputs, including local aliases that resolve to `object`. Accept a named owner type or a constrained generic.
- `no-runtime-typeof` rejects ad hoc runtime representation checks in favor of schema or parser boundaries. Set `allowInTypeGuards` only for repositories whose explicit type predicates or assertion functions own validation.
- `no-unknown-parameters` rejects explicit `unknown` inputs except the `cause` convention for error enrichment. Run an expected parser at the I/O boundary and pass its named output into repository functions.
- `no-unknown-returns` rejects explicit `unknown` and `Promise<unknown>` return contracts, including local aliases. Parse before returning so callers receive a named domain type.
- `no-unknown-type-aliases` rejects aliases that only conceal `unknown`. Keep an intentionally open nested field visible in its owner type instead of naming the top type.
- `no-unsafe-dictionary-type` rejects dictionaries whose direct value contract is `unknown`, `any`, `object`, `{}`, or an equivalent union or alias. Use an owner-defined value type and parse external payloads before insertion.

## Object and API construction

- `no-conditional-empty-object-spread` rejects conditional spreads that use `{}` to omit a property. Create a typed object and add the property only in the branch where it is present.
- `no-conditional-undefined-properties` rejects object properties whose conditional value is `undefined`. Omit the property through a branched call or a typed local object so presence has one meaning.
- `no-enum-declarations` rejects runtime TypeScript enums. Use literal unions or inferred constant objects. Const enums, ambient enums, and declaration-file enums remain valid when a boundary requires them.
- `no-positional-boolean-parameters` rejects boolean flags on repository-owned named function declarations and bindings. Use a named options object. `allowFunctionNames` preserves signatures fixed by an external protocol.
- `no-reflect-apply` rejects dynamic invocation through `Reflect.apply`. Call a typed function directly or place dynamic dispatch behind a named interface.
- `no-reflect-get` rejects dynamic reads through `Reflect.get`. Use typed property access or parse a dynamic value into a named contract before reading it.
- `prefer-options-parameter` rejects repository-owned named function declarations and bindings with three or more inputs. Replace the positional inputs with one named options object. `allowFunctionNames` preserves signatures fixed by an external protocol.

## Async errors

- `no-unhandled-detached-promises` rejects `void` call chains without an observable rejection handler. Add `.catch(...)` or pass a rejection callback as the second argument to `.then(...)`. The shared ESLint and Oxlint implementation detects explicit call syntax rather than inferred promise types because Oxlint plugins do not expose TypeScript parser services.

## Lint policy

- `require-lint-suppression-reason` requires ESLint and Oxlint disable directives to include a non-empty reason after `--`. State the runtime, framework, or external boundary that forces the suppression.

## Ownership and tests

- `no-module-mocking` rejects Vitest and Jest mocks of repository-owned modules. Inject an unowned dependency through a production boundary and test with a real implementation or stateful fake. `internalModulePrefixes` marks package-style workspace imports as repository-owned.
- `no-shape-in-symbol-names` rejects `shape` in repository-owned JavaScript, TypeScript, private, and JSX symbol names. Name the symbol for its domain responsibility. Static property access remains unchanged because the property can belong to an external protocol.

## Layout

- [`consistent-blank-lines`](./rules/consistent-blank-lines.md) groups statements and JSX children into paragraphs based on name flow, matching declarations, control flow, hooks, comments, and line span. Its detailed specification owns the formatting contract and fixer behavior.
