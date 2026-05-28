# @utilfirst/eslint-plugin

Shared ESLint rules for utilfirst projects. ESM-only, flat config only, ESLint v9/v10 peer.

## Directory layout

```
.github/workflows/                  ci.yml (lint + build + test on PR), publish.yml (tag-triggered OIDC publish)
docs/rules/                         Per-rule spec docs, linked from each rule's meta.docs.url
src/
├── index.ts                        Plugin entry: meta, rules map, configs.recommended (assigns key "utilfirst")
└── rules/                          One file per rule, with colocated `*.test.ts` siblings
```

## Workflow

- After any file change: `pnpm exec eslint --fix <file>` and `pnpm exec prettier --write <file>`
- After finishing a set of related changes: `pnpm test` and `pnpm run lint:typecheck`
- After cloning: `pnpm run setup-hooks` to wire the simple-git-hooks pre-commit

## Build and bundling

- `pnpm run build` runs tsdown. `prepack` chains it before `npm pack`/`publish`
- Output is `dist/index.js` + `dist/index.d.ts`. The `outExtensions: () => ({ js: ".js" })` override is load-bearing. Tsdown defaults to `.mjs`, but the `exports` field references `.js` to match `"type": "module"` convention
- `@typescript-eslint/utils` is shipped as a runtime `dependency` and marked `external` in `tsdown.config.ts`. Bundling it pushes the package from 18 kB to 495 kB and bloats every consumer

## Testing

- Test runner is vitest. Rule tester is `@typescript-eslint/rule-tester` with vitest hooks bound in each test file (`RuleTester.afterAll = afterAll`, etc.)
- `parserOptions: { ecmaFeatures: { jsx: true, globalReturn: true } }` is set on the `RuleTester` constructor so JSX fixtures and top-level `return` fixtures parse without per-case overrides

## Spec source

- The blank-lines rule's spec lives in two places: as a comment at the top of `src/rules/consistent-blank-lines.ts` and in `docs/rules/consistent-blank-lines.md`. The rule's behavior is the source of truth for users, `docs/rules/consistent-blank-lines.md` is the source of truth for the spec text
- When the spec changes, update both copies in this repo

## Lifecycle scripts

- No `prepare` and no `postinstall`. `simple-git-hooks` is wired through `pnpm run setup-hooks` instead. The earlier `postinstall`/`prepare` form tripped pnpm's `[ERR_PNPM_IGNORED_BUILDS]` gate on every consumer install, and the `false` opt-out in `pnpm-workspace.yaml` did not survive pnpm's auto-rewrite
- `prepack` runs the build before pack/publish so the tarball always contains a fresh `dist/`

## Consumer linking

- Sibling repos in `/Users/yenbekbay/Developer/` consume this plugin from npm at `^X.Y.Z`. For local iteration against unpublished changes, swap to `link:../utilfirst-eslint-plugin` (not `file:`, which triggers pnpm's ignored-build-scripts gate)

## Release

- One-time setup: configure an npm trusted publisher on npmjs.com pointing at scope `@utilfirst`, repo `utilfirst/utilfirst-eslint-plugin`, workflow `publish.yml`, environment `release`. Create a matching `release` GitHub environment
- Each release: bump `version` in `package.json`, tag `vX.Y.Z`, push the tag. `publish.yml` builds, runs lint + test, packs, publishes with OIDC + automatic provenance, then emits release notes via changelogithub
- No NPM_TOKEN. The `release` environment is the gate

## Excluded tooling

- `@arethetypeswrong/cli` is not wired up. `@andrewbranch/untar.js` (attw's tar reader) throws `Cannot read properties of undefined (reading 'filename')` on Node 24 across attw 0.15-0.18 for this package's tarball shape. `publint` covers the publishing surface (exports, types, file list)
