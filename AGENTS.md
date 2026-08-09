# @utilfirst/eslint-plugin

Shared ESLint rules for utilfirst projects. ESM-only, flat config only, ESLint v9/v10 peer.

## Workflow

- After changing an ESLint-supported file: `pnpm exec eslint --fix <file>` and `pnpm exec prettier --write <file>`
- After changing another Prettier-supported file: `pnpm exec prettier --write <file>`
- After finishing a set of related changes: `pnpm test` and `pnpm run lint:typecheck`

## Boundaries

- Ask first before bumping the major version (most consumers are pinned to `^X.Y.Z`, so a major bump forces an upgrade across projects that depend on this plugin).
- Ask first before adding a new rule to `configs.recommended` (consumers that auto-upgrade pick it up on the next install).
- Ask first before the one-time package bootstrap through local `npm publish --provenance=false`.
- Never publish manually after the package has an npm trusted publisher. The OIDC publisher in `publish.yml` is the sanctioned release path.
- Never tag a release without `pnpm test` and `pnpm run lint:typecheck` green locally.

## Stack

- ESM-only ESLint flat-config plugin bundled with tsdown and tested through Vitest plus the TypeScript ESLint rule tester.

## Structure

- Read `package.json` and `mise.toml` for the peer contract, dependencies, scripts, and toolchain versions.
- Read `tsdown.config.ts` and the `package.json` exports before changing bundle output.
- Update `docs/rules/consistent-blank-lines.md` with `src/rules/consistent-blank-lines.ts` when that rule's specification changes.
- Read `.github/workflows/{ci,publish}.yml` before changing compatibility checks or release delivery.

```
.github/workflows/
├── ci.yml                          Lint + build + test on PR
└── publish.yml                     Tag-triggered OIDC publish
docs/rules/                         Per-rule spec docs, linked from each rule's meta.docs.url
src/
├── index.ts                        Plugin entry: meta, rules map, configs.recommended
└── rules/                          One file per rule, with colocated `*.test.ts` siblings
```

## Commands

- `pnpm install`: install dependencies
- `pnpm run setup-hooks`: wire the `simple-git-hooks` pre-commit (run once after clone)
- `pnpm run build`: bundle via tsdown to `dist/index.js` + `dist/index.d.ts`
- `pnpm test`: run vitest

## Build and bundling

- `pnpm run build` runs tsdown. `prepack` chains it before `npm pack`/`publish`
- Output is `dist/index.js` + `dist/index.d.ts`. The `outExtensions: () => ({ js: ".js" })` override is load-bearing. Tsdown defaults to `.mjs`, but the `exports` field references `.js` to match `"type": "module"` convention
- `@typescript-eslint/utils` is shipped as a runtime `dependency` and marked `external` in `tsdown.config.ts`. Bundling it pushes the package from 18 kB to 495 kB and bloats every consumer

## Testing

- Test runner is vitest. Rule tester is `@typescript-eslint/rule-tester` with vitest hooks bound in each test file (`RuleTester.afterAll = afterAll`, etc.)
- `parserOptions: { ecmaFeatures: { jsx: true, globalReturn: true } }` is set on the `RuleTester` constructor so JSX fixtures and top-level `return` fixtures parse without per-case overrides

## Spec source

- The blank-lines rule's spec lives in two places: as a comment at the top of `src/rules/consistent-blank-lines.ts` and in `docs/rules/consistent-blank-lines.md`. The rule's behavior governs users; the spec doc is the canonical text. Update both on any spec change.

## Lifecycle scripts

- Wire `simple-git-hooks` through `pnpm run setup-hooks` instead of `prepare` or `postinstall`. The hook-script form tripped pnpm's `[ERR_PNPM_IGNORED_BUILDS]` gate on every consumer install, and the `false` opt-out in `pnpm-workspace.yaml` did not survive pnpm's auto-rewrite.
- `prepack` runs the build before pack/publish so the tarball always contains a fresh `dist/`

## Release

- Configure the npm trusted publisher for scope `@utilfirst`, repository `utilfirst/utilfirst-eslint-plugin`, workflow `publish.yml`, and environment `release`. Create the matching GitHub environment.
- Bootstrap the package only after approval with `npm publish --provenance=false`, then add the trusted publisher to the new package. Subsequent versions use `publish.yml`.
- Bump `version` in `package.json`, tag `vX.Y.Z`, and push the tag for each release. The workflow builds, checks, packs, publishes through OIDC, and writes release notes.
- Keep `NPM_TOKEN` out of the release path. The `release` environment is the gate.

## Excluded tooling

- Keep `@arethetypeswrong/cli` out until its tar reader supports this package's tarball under the pinned Node toolchain. Use `publint` for exports, types, and package-file checks.

## Consumer linking

- Sibling repos consume this plugin from npm at `^X.Y.Z`. For local iteration against unpublished changes, swap to `link:../utilfirst-eslint-plugin` (not `file:`, which triggers pnpm's ignored-build-scripts gate).
