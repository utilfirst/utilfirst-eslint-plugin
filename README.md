# @utilfirst/eslint-plugin

Shared rules for ESLint 10 and Oxlint.

## Policy

Every exported rule must express universal project policy. The recommended config enables the complete registry at error severity, and the test suite rejects registry entries that are absent from that config. A rule that cannot justify universal error severity must be redesigned or removed rather than moved to an optional preset. Rule options adapt repository ownership or boundary conventions without disabling the rule.

## Install

```sh
pnpm add -D @utilfirst/eslint-plugin
```

## Use

```js
// eslint.config.mjs
import utilfirst from "@utilfirst/eslint-plugin";

export default [
  utilfirst.configs.recommended,
  // ...your other configs
];
```

## Configure

Rules with repository-specific ownership or boundary conventions accept options in either runtime. Apply option overrides after the recommended config so the rule stays enabled.

```js
export default [
  utilfirst.configs.recommended,
  {
    rules: {
      "utilfirst/no-module-mocking": [
        "error",
        { internalModulePrefixes: ["@workspace/"] },
      ],
      "utilfirst/require-repository-test-subject": [
        "error",
        { internalModulePrefixes: ["@workspace/"] },
      ],
      "utilfirst/no-positional-boolean-parameters": [
        "error",
        { allowFunctionNames: ["protocolCallback"] },
      ],
      "utilfirst/no-unknown-parameters": [
        "error",
        { allowParameterNames: ["externalPayload"] },
      ],
      "utilfirst/prefer-options-parameter": [
        "error",
        { allowFunctionNames: ["protocolCallback"] },
      ],
    },
  },
];
```

- `internalModulePrefixes` marks package-style import prefixes as repository-owned for `no-module-mocking` and `require-repository-test-subject`.
- `allowFunctionNames` preserves named functions whose positional boolean or multi-input signature is fixed by an external protocol.
- `allowParameterNames` preserves `unknown` parameters whose names identify an externally fixed callback or interface signature.

For Oxlint TypeScript configuration, import the canonical shared policy and layer repository and platform boundaries after it:

```ts
// oxlint.config.ts
import { defineConfig } from "oxlint";
import { oxlintBaseConfig } from "@utilfirst/eslint-plugin/oxlint";

export default defineConfig({
  extends: [oxlintBaseConfig],
  ignorePatterns: ["dist/**", "node_modules/**"],
  plugins: ["jsx-a11y", "nextjs", "node"],
});
```

The base config owns shared categories, environment defaults, plugins, compiler-diagnostic overrides, React settings, native rules, and every exported custom rule. Repositories retain ignore paths, platform plugins, platform environments, generated-file treatment, and reasoned exceptions.

## Rules

[`docs/rules.md`](./docs/rules.md) explains the policy boundary and expected replacement for every rule. The implementations and colocated tests remain the executable behavior owners.

| Rule                                                                                    | Description                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`consistent-blank-lines`](./docs/rules/consistent-blank-lines.md)                      | Apply tight, separate, or preserved gaps between statements and JSX children    |
| [`no-call-count-only-test`](./docs/rules.md#ownership-and-tests)                        | Reject tests supported only by mock call counts or omission                     |
| [`no-chained-type-assertions`](./docs/rules.md#type-evidence)                           | Reject chained TypeScript assertions                                            |
| [`no-conditional-undefined-properties`](./docs/rules.md#object-and-api-construction)    | Reject conditional undefined object properties                                  |
| [`no-enum-declarations`](./docs/rules.md#object-and-api-construction)                   | Reject repository-owned enums other than ambient declarations                   |
| [`no-imported-constant-restatement`](./docs/rules.md#ownership-and-tests)               | Require behavior evidence instead of imported constant restatements             |
| [`no-known-value-widening`](./docs/rules.md#type-evidence)                              | Reject known values widened into broad target types                             |
| [`no-module-mocking`](./docs/rules.md#ownership-and-tests)                              | Reject Vitest and Jest mocking of repository-owned modules                      |
| [`no-negated-throw-assertion`](./docs/rules.md#ownership-and-tests)                     | Replace negated throw assertions with direct execution                          |
| [`no-object-parameters`](./docs/rules.md#boundary-contracts)                            | Reject `object` function parameters                                             |
| [`no-positional-boolean-parameters`](./docs/rules.md#object-and-api-construction)       | Reject positional boolean flags on directly named callable contracts            |
| [`no-promise-settlement-only-assertion`](./docs/rules.md#ownership-and-tests)           | Require a promise assertion to describe its result or specific failure          |
| [`no-reflect-apply`](./docs/rules.md#object-and-api-construction)                       | Reject `Reflect.apply`                                                          |
| [`no-reflect-get`](./docs/rules.md#object-and-api-construction)                         | Reject `Reflect.get`                                                            |
| [`no-test-snapshots`](./docs/rules.md#ownership-and-tests)                              | Require explicit observable assertions instead of snapshots                     |
| [`no-truthy-falsy-assertion`](./docs/rules.md#ownership-and-tests)                      | Require exact expected values instead of truthiness                             |
| [`no-uncontrolled-time-in-test`](./docs/rules.md#ownership-and-tests)                   | Require clock control in each owning test or setup scope                        |
| [`no-unknown-parameters`](./docs/rules.md#boundary-contracts)                           | Keep `unknown` inputs at declared or input-consuming decoder boundaries         |
| [`no-unknown-returns`](./docs/rules.md#boundary-contracts)                              | Reject `unknown` return contracts                                               |
| [`no-unknown-type-aliases`](./docs/rules.md#boundary-contracts)                         | Reject type aliases that resolve to `unknown`                                   |
| [`no-unsafe-dictionary-type`](./docs/rules.md#boundary-contracts)                       | Reject object and Map dictionary contracts with broad value types               |
| [`no-unhandled-detached-promises`](./docs/rules.md#async-errors)                        | Require terminal rejection handling on `void`-marked detached chains            |
| [`no-widen-then-assert`](./docs/rules.md#type-evidence)                                 | Reject const flows that widen a known value before narrowing it                 |
| [`prefer-forwarded-props-order`](./docs/rules.md#react-source-form)                     | Put forwarded props before component-controlled JSX attributes                  |
| [`prefer-hook-order`](./docs/rules.md#react-source-form)                                | Order built-in hooks by context, state, derivation, and effect role             |
| [`prefer-jsx-boolean-and`](./docs/rules.md#jsx-conditionals)                            | Require boolean JSX guards and normalize null-branch conditionals               |
| [`prefer-options-parameter`](./docs/rules.md#object-and-api-construction)               | Require options objects for named callable contracts with three or more inputs  |
| [`prefer-react-props-reference`](./docs/rules.md#react-source-form)                     | Keep React component props behind one named parameter                           |
| [`prefer-switch-discriminator-chain`](./docs/rules.md#object-and-api-construction)      | Require a switch for four or more equality branches on one discriminator        |
| [`prefer-top-level-function-declarations`](./docs/rules.md#object-and-api-construction) | Require declarations for direct top-level function bindings and default exports |
| [`require-lint-suppression-reason`](./docs/rules.md#lint-policy)                        | Require a forcing reason on lint disable directives                             |
| [`require-repository-test-subject`](./docs/rules.md#ownership-and-tests)                | Require behavioral tests to import repository-owned code                        |
| [`require-safety-comment-for-type-assertion`](./docs/rules.md#type-evidence)            | Require one `SAFETY:` comment for each outermost non-const assertion            |
| [`require-special-comment-tag`](./docs/rules.md#comments)                               | Require canonical uppercase tags and colons on special comments                 |

## Attribution

The rules other than `consistent-blank-lines`, `no-call-count-only-test`, `no-conditional-undefined-properties`, `no-enum-declarations`, `no-imported-constant-restatement`, `no-negated-throw-assertion`, `no-positional-boolean-parameters`, `no-promise-settlement-only-assertion`, `no-test-snapshots`, `no-truthy-falsy-assertion`, `no-uncontrolled-time-in-test`, `no-unhandled-detached-promises`, `prefer-forwarded-props-order`, `prefer-hook-order`, `prefer-jsx-boolean-and`, `prefer-options-parameter`, `prefer-react-props-reference`, `require-lint-suppression-reason`, `require-repository-test-subject`, and `require-special-comment-tag`, along with their helpers, are adapted from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop/) under the MIT License. The package's [LICENSE](./LICENSE) retains the copyright and permission notice.

## Develop

```sh
pnpm install
pnpm test      # unit, dual-runtime, and packed-artifact tests
pnpm run build # tsdown → dist/
pnpm run lint  # oxlint + prettier + publint
```

## License

MIT. The package includes third-party code under the same license.
