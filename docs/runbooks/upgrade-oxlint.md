# Upgrade Oxlint

This runbook upgrades Oxlint and reconciles its built-in rules and category configuration with the canonical policy. `AGENTS.md` owns repository boundaries and shared policy routing, source files own exact enforcement, and the release workflow owns publication acceptance.

## Preconditions

- Start from a classified worktree and keep unrelated changes outside the upgrade commit.
- Read `package.json` and `mise.toml` for the runtime, peer, dependency, and toolchain contracts.
- Read `src/oxlint.ts`, `.oxlintrc.json`, `src/index.ts`, and `docs/rules.md` for the canonical config, repository config, custom-rule registry, and rule-policy owners.
- Identify a representative consumer that can load the package through a temporary `link:` dependency and run its canonical lint and test gates.

## Capture the current rule surface

1. Record the pinned Oxlint version and the effective config for representative TypeScript, React, JavaScript, and test files with `pnpm exec oxlint --print-config <file>`.
2. Record the registered built-in rule list from a neutral directory so repository config cannot mask category membership:

   ```sh
   plugin_repo=$PWD
   audit_dir=$(mktemp -d)
   (
     cd "$audit_dir"
     "$plugin_repo/node_modules/.bin/oxlint" --disable-nested-config --type-aware -D all -D nursery --import-plugin --react-plugin --vitest-plugin --promise-plugin --print-config representative.ts
   )
   ```

3. Keep noisy comparison output under `.tmp/` and retain only the rule additions, removals, category changes, default changes, and option-schema changes needed for the decision.

## Upgrade the toolchain

1. Update the Oxlint, `oxlint-tsgolint`, and `@oxlint/plugins` declarations that share the runtime contract.
2. Regenerate the lockfile with the repository package manager and reject unrelated dependency or formatting churn.
3. Re-run the rule-surface capture against the upgraded installation.

## Reconcile policy

1. Compare newly registered rules and changes to category definitions, defaults, and membership against the universal policy in `AGENTS.md` and `docs/rules.md`.
2. Prefer a built-in rule when it enforces the same contract as repository-owned enforcement. Compare semantics, options, diagnostics, and runtime coverage before replacing a custom rule.
3. Keep correctness, pedantic, performance, and suspicious categories enabled. Assess restriction, style, and nursery rules individually because their complete sets contain project-specific preferences and conflicting contracts.
4. Remove plain explicit rule entries already enabled at the same severity by an active category. Retain an explicit entry when it sets options, enables an extra-category policy, or overrides an active category rule.
5. Remove suppressions for rules that no active category enables. Keep suppressions that reject an otherwise active category policy.
6. Reconcile `.oxlintrc.json` with the canonical decisions while preserving repository-only environments, file overrides, and the local plugin specifier.
7. Compare the resulting custom rules and canonical config with active global agent instructions. Route a portable guidance change to its configured global source owner, and keep exact rule behavior and repository exceptions local.
8. Update `README.md` when configuration usage or the published rule surface changes. Update `docs/rules.md` and source-owned rule documentation when a custom rule contract changes.

## Failure recovery

- If dependency resolution changes unrelated packages or lockfile structure, revert only the upgrade batch and repeat with the pinned package-manager version.
- If a built-in rule appears equivalent but differs on a boundary case, retain the custom rule until a targeted runtime fixture proves replacement coverage.
- If a category change creates widespread violations, classify each violation against universal policy before adding an exception. Do not preserve the upgrade by silently weakening valid enforcement.
- If a temporary consumer link or install fails after changing local dependency state, restore its manifest and lockfile before retrying or reporting completion.

## Verification

1. Run `pnpm exec oxlint --fix <changed-file>` and `pnpm exec prettier --write <changed-file>` for every changed Oxlint-supported file.
2. Prove that no plain error entry duplicates an enabled category and no suppression targets a rule outside the enabled categories.
3. Run `pnpm run test` and `pnpm run lint` in this repository.
4. Build or exercise the package fixture that imports `@utilfirst/eslint-plugin/oxlint`.
5. Link the package into the representative consumer, run its canonical lint and test gates, then restore the published dependency declaration and lockfile.
6. Re-open the final diff and confirm that package declarations, runtime pins, category policy, custom-rule ownership, repository self-lint policy, documentation, and active agent instructions agree.
