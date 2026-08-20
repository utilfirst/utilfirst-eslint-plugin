# @utilfirst/eslint-plugin

Shared rules for ESLint 10 and Oxlint.

## Policy

Every exported rule is universal project policy. The recommended config enables the complete registry at error severity, and the test suite rejects registry entries that are absent from that config. Rule options adapt repository ownership or boundary conventions without disabling the rule.

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
      "utilfirst/no-positional-boolean-parameters": [
        "error",
        { allowFunctionNames: ["protocolCallback"] },
      ],
      "utilfirst/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
    },
  },
];
```

- `internalModulePrefixes` marks package-style import prefixes as repository-owned for `no-module-mocking`.
- `allowFunctionNames` preserves named functions whose positional boolean signature is fixed by an external protocol.
- `allowInTypeGuards` permits `typeof` inside explicit type predicates while continuing to reject ad hoc runtime narrowing.

```jsonc
// .oxlintrc.json
{
  "jsPlugins": [
    {
      "name": "utilfirst",
      "specifier": "@utilfirst/eslint-plugin",
    },
  ],
  "rules": {
    "utilfirst/consistent-blank-lines": "error",
    "utilfirst/no-chained-type-assertions": "error",
    "utilfirst/no-conditional-empty-object-spread": "error",
    "utilfirst/no-conditional-undefined-properties": "error",
    "utilfirst/no-enum-declarations": "error",
    "utilfirst/no-known-value-widening": "error",
    "utilfirst/no-module-mocking": [
      "error",
      { "internalModulePrefixes": ["@workspace/"] },
    ],
    "utilfirst/no-object-parameters": "error",
    "utilfirst/no-positional-boolean-parameters": [
      "error",
      { "allowFunctionNames": ["protocolCallback"] },
    ],
    "utilfirst/no-reflect-apply": "error",
    "utilfirst/no-reflect-get": "error",
    "utilfirst/no-runtime-typeof": ["error", { "allowInTypeGuards": true }],
    "utilfirst/no-shape-in-symbol-names": "error",
    "utilfirst/no-unknown-parameters": "error",
    "utilfirst/no-unknown-returns": "error",
    "utilfirst/no-unknown-type-aliases": "error",
    "utilfirst/no-unsafe-dictionary-type": "error",
    "utilfirst/no-widen-then-assert": "error",
    "utilfirst/require-safety-comment-for-type-assertion": "error",
  },
}
```

## Rules

[`docs/rules.md`](./docs/rules.md) explains the policy boundary and expected replacement for every rule. The implementations and colocated tests remain the executable behavior owners.

| Rule                                                                                 | Description                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [`consistent-blank-lines`](./docs/rules/consistent-blank-lines.md)                   | Insert blank lines between statement-list and JSXChild items that start a new thought |
| [`no-chained-type-assertions`](./docs/rules.md#type-evidence)                        | Reject chained TypeScript assertions                                                  |
| [`no-conditional-empty-object-spread`](./docs/rules.md#object-and-api-construction)  | Reject conditional empty-object spreads                                               |
| [`no-conditional-undefined-properties`](./docs/rules.md#object-and-api-construction) | Reject conditional undefined object properties                                        |
| [`no-enum-declarations`](./docs/rules.md#object-and-api-construction)                | Reject runtime enums other than const and ambient enums                               |
| [`no-known-value-widening`](./docs/rules.md#type-evidence)                           | Reject known values widened into broad target types                                   |
| [`no-module-mocking`](./docs/rules.md#ownership-and-tests)                           | Reject Vitest and Jest mocking of repository-owned modules                            |
| [`no-object-parameters`](./docs/rules.md#boundary-contracts)                         | Reject `object` function parameters                                                   |
| [`no-positional-boolean-parameters`](./docs/rules.md#object-and-api-construction)    | Reject positional boolean flags on named functions                                    |
| [`no-reflect-apply`](./docs/rules.md#object-and-api-construction)                    | Reject `Reflect.apply`                                                                |
| [`no-reflect-get`](./docs/rules.md#object-and-api-construction)                      | Reject `Reflect.get`                                                                  |
| [`no-runtime-typeof`](./docs/rules.md#boundary-contracts)                            | Reject runtime `typeof` checks                                                        |
| [`no-shape-in-symbol-names`](./docs/rules.md#ownership-and-tests)                    | Reject `shape` in symbols other than static properties                                |
| [`no-unknown-parameters`](./docs/rules.md#boundary-contracts)                        | Reject explicit `unknown` parameters                                                  |
| [`no-unknown-returns`](./docs/rules.md#boundary-contracts)                           | Reject `unknown` return contracts                                                     |
| [`no-unknown-type-aliases`](./docs/rules.md#boundary-contracts)                      | Reject type aliases that resolve to `unknown`                                         |
| [`no-unsafe-dictionary-type`](./docs/rules.md#boundary-contracts)                    | Reject dictionary contracts with broad value types                                    |
| [`no-widen-then-assert`](./docs/rules.md#type-evidence)                              | Reject const flows that widen a known value before narrowing it                       |
| [`require-safety-comment-for-type-assertion`](./docs/rules.md#type-evidence)         | Require a `SAFETY:` comment for non-const type assertions                             |

## Attribution

The rules other than `consistent-blank-lines`, `no-conditional-undefined-properties`, `no-enum-declarations`, and `no-positional-boolean-parameters`, along with their helpers, are adapted from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop/) under the MIT License. The package's [LICENSE](./LICENSE) retains the copyright and permission notice.

## Develop

```sh
pnpm install
pnpm run setup-hooks # one-time: wire pre-commit via simple-git-hooks
pnpm test            # unit, dual-runtime, and packed-artifact tests
pnpm run build       # tsdown → dist/
pnpm run lint        # eslint + prettier + publint + tsc
```

## License

MIT. The package includes third-party code under the same license.
