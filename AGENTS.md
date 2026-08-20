# @utilfirst/eslint-plugin

Shared rules for ESLint 10 and Oxlint. The package is ESM-only and supports ESLint flat config only.

## Workflow

- After changing an Oxlint-supported file: `pnpm exec oxlint --fix <file>` and `pnpm exec prettier --write <file>`
- After changing another Prettier-supported file: `pnpm exec prettier --write <file>`
- Update `README.md` in the same change when package installation, configuration usage, the published rule list, or development commands change.
- Update `docs/rules/consistent-blank-lines.md` in the same change when `src/rules/consistent-blank-lines.ts` changes the rule's source-owned behavior or specification.
- After finishing a set of related changes: `pnpm test` and `pnpm run lint:oxlint`

## Boundaries

- Ask first before bumping the major version (most consumers are pinned to `^X.Y.Z`, so a major bump forces an upgrade across projects that depend on this plugin).
- Ask first before adding a new rule to `configs.recommended` (consumers that auto-upgrade pick it up on the next install).
- Ask first before the one-time package bootstrap through local `npm publish --provenance=false`.
- Never publish manually after the package has an npm trusted publisher. The OIDC publisher in `publish.yml` is the sanctioned release path.
- Never tag a release without `pnpm test` and `pnpm run lint` green locally.

## Stack

- ESM-only ESLint and Oxlint plugin bundled with tsdown and tested through Vitest, the TypeScript ESLint rule tester, and an Oxlint runtime fixture.

## Structure

- Read `package.json` and `mise.toml` for the peer contract, dependencies, scripts, and toolchain versions.
- Let `.oxlintrc.json` own repository lint and type-check policy.
- Read `tsdown.config.ts` and the `package.json` exports before changing bundle output.
- Read `.github/workflows/{ci,publish}.yml` before changing compatibility checks or release delivery.

```
.github/workflows/
├── ci.yml                          Lint + build + test on PR
└── publish.yml                     Tag-triggered OIDC publish
docs/rules/                         Source-owned specifications for rules that require detailed behavior contracts
src/
├── index.ts                        Plugin entry: meta, rules map, configs.recommended
└── rules/                          One file per rule, with colocated `*.test.ts` siblings
```

## Commands

- `pnpm install`: install dependencies
- `pnpm run setup-hooks`: wire the `simple-git-hooks` pre-commit (run once after clone)
- `pnpm run build`: bundle via tsdown to `dist/index.js` + `dist/index.d.ts`
- `pnpm test`: run vitest
- `pnpm run lint`: run Oxlint with type checking, Prettier, and publint

## Build and bundling

- `pnpm run build` runs tsdown. `prepack` chains it before `npm pack`/`publish`
- Output is `dist/index.js` + `dist/index.d.ts`. The `outExtensions: () => ({ js: ".js" })` override is load-bearing. Tsdown defaults to `.mjs`, but the `exports` field references `.js` to match `"type": "module"` convention
- `@typescript-eslint/utils` is shipped as a runtime `dependency` and marked `external` in `tsdown.config.ts` so the package does not bundle another copy for each consumer

## Testing

- Test runner is vitest. Rule tester is `@typescript-eslint/rule-tester` with vitest hooks bound in each test file (`RuleTester.afterAll = afterAll`, etc.)
- Set parser options on each `RuleTester` constructor only when its fixtures require JSX, module, or top-level return parsing

## Rule policy

- Every exported rule must express universal project policy and remain enabled at error severity in `configs.recommended`.
- Assess a rule against the plugin's anti-slop purpose and shared consumer conventions before recommending removal.
- Prefer tightening detection or adding a narrow exact option when a rule has legitimate boundary cases.
- Do not treat one legitimate niche use as sufficient evidence for removal. Check whether a documented option or reasoned lint suppression preserves the strong default.
- Redesign or remove a rule when its enforced contract does not justify universal error severity. Do not retain optional exported rules or a second preset.
- Recommend removal only after proving that no enforceable universal contract can justify the rule at error severity.
- Treat the registry-completeness test in `src/index.test.ts` as the enforcement owner for the all-recommended invariant.

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
