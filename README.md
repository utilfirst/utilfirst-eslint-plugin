# @utilfirst/eslint-plugin

Shared rules for ESLint 10 and Oxlint.

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

The recommended config enables every rule at error severity.

Or wire rules individually:

```js
import utilfirst from "@utilfirst/eslint-plugin";

export default [
  {
    plugins: { utilfirst },
    rules: {
      "utilfirst/no-module-mocking": "error",
    },
  },
];
```

Rules with consumer-specific ownership accept options in either runtime. For example, declare workspace import prefixes for `no-module-mocking`:

```js
"utilfirst/no-module-mocking": [
  "error",
  { internalModulePrefixes: ["@workspace/"] },
];
```

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
    "utilfirst/no-module-mocking": "error",
  },
}
```

## Rules

| Rule                                                               | Description                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [`consistent-blank-lines`](./docs/rules/consistent-blank-lines.md) | Insert blank lines between statement-list and JSXChild items that start a new thought |
| `no-chained-type-assertions`                                       | Reject chained TypeScript assertions                                                  |
| `no-conditional-empty-object-spread`                               | Reject conditional empty-object spreads                                               |
| `no-conditional-undefined-properties`                              | Reject conditional undefined object properties                                        |
| `no-enum-declarations`                                             | Reject runtime enums other than const and ambient enums                               |
| `no-known-value-widening`                                          | Reject known values widened into broad target types                                   |
| `no-module-mocking`                                                | Reject Vitest and Jest mocking of repository-owned modules                            |
| `no-object-parameters`                                             | Reject `object` function parameters                                                   |
| `no-positional-boolean-parameters`                                 | Reject positional boolean flags on named functions                                    |
| `no-reflect-apply`                                                 | Reject `Reflect.apply`                                                                |
| `no-reflect-get`                                                   | Reject `Reflect.get`                                                                  |
| `no-runtime-typeof`                                                | Reject runtime `typeof` checks                                                        |
| `no-shape-in-symbol-names`                                         | Reject `shape` in symbols other than static properties                                |
| `no-unknown-parameters`                                            | Reject explicit `unknown` parameters                                                  |
| `no-unknown-returns`                                               | Reject `unknown` return contracts                                                     |
| `no-unknown-type-aliases`                                          | Reject type aliases that resolve to `unknown`                                         |
| `no-unsafe-dictionary-type`                                        | Reject dictionary contracts with broad value types                                    |
| `no-widen-then-assert`                                             | Reject const flows that widen a known value before narrowing it                       |
| `require-safety-comment-for-type-assertion`                        | Require a `SAFETY:` comment for non-const type assertions                             |

## Attribution

The rules other than `consistent-blank-lines` and their helpers are adapted from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop/) under the MIT License. The package's [LICENSE](./LICENSE) retains the copyright and permission notice.

## Develop

```sh
pnpm install
pnpm run setup-hooks # one-time: wire pre-commit via simple-git-hooks
pnpm test            # vitest, ESLint, and Oxlint
pnpm run build       # tsdown → dist/
pnpm run lint        # eslint + prettier + publint + tsc
```

## License

MIT. The package includes third-party code under the same license.
