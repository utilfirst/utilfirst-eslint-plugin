# @utilfirst/eslint-plugin

Shared ESLint rules for utilfirst projects. Flat config only, ESLint v9 / v10.

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

Or wire rules individually:

```js
import utilfirst from "@utilfirst/eslint-plugin";

export default [
  {
    plugins: { utilfirst },
    rules: {
      "utilfirst/consistent-blank-lines": "error",
    },
  },
];
```

## Rules

| Rule                                                               | Description                                                                          | Fixable |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------- |
| [`consistent-blank-lines`](./docs/rules/consistent-blank-lines.md) | Insert blank lines between statement-list and JSXChild items that start new thoughts | yes     |

## Develop

```sh
pnpm install
pnpm run setup-hooks # one-time: wire pre-commit via simple-git-hooks
pnpm test            # vitest + @typescript-eslint/rule-tester
pnpm run build       # tsdown → dist/
pnpm run lint        # eslint + prettier + publint + tsc
```

## License

MIT
