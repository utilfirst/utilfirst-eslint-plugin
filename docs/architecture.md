# Architecture

This document owns the plugin’s public exports, rule registry, canonical configuration composition, build outputs, and verification boundaries. Read it before changing how consumers load or execute the package.

| Decision                                           | Read                                                      |
| -------------------------------------------------- | --------------------------------------------------------- |
| Universal rule rationale and expected replacements | [Rule policy](reference/rule-policy.md)                   |
| Detailed blank-line behavior and fixer contract    | [Consistent blank lines](specs/consistent-blank-lines.md) |
| Oxlint dependency and policy upgrade procedure     | [Upgrade Oxlint](runbooks/upgrade-oxlint.md)              |
| Installation and consumer configuration            | [README](../README.md)                                    |

## Public surface

The package is ESM-only. Its root export provides plugin metadata, the complete custom-rule registry, and `configs.recommended`. The `@utilfirst/eslint-plugin/oxlint` export provides the shared Oxlint base configuration. `package.json` owns exact export paths, peer ranges, runtime requirements, and published files.

## Rule ownership

Each file under `src/rules/` owns one rule’s executable behavior. Colocated tests own accepted and rejected runtime cases. `src/index.ts` owns the public registry and recommended ESLint configuration, while its registry-completeness test enforces that every exported rule remains recommended at error severity. Removed rules leave no registry alias or compatibility stub.

Shared parsers and boundary classifiers live under `src/shared/`. A helper belongs there only when several rules consume the same semantic contract.

## Oxlint configuration

`src/oxlint.ts` owns the shared built-in categories, plugins, settings, custom rules, and overrides exposed to consumers. Repository `oxlint.config.ts` extends that shared owner and adds only self-hosting and repository-specific boundaries.

## Build and publication

Tsdown bundles JavaScript and declarations into the paths named by `package.json`. The prepack lifecycle rebuilds those outputs before packing. The tag-triggered workflow verifies and publishes through npm’s trusted publisher.

## Verification boundaries

Unit tests exercise rules through the TypeScript ESLint rule tester. Dual-runtime fixtures compare ESLint and Oxlint behavior. The package test builds and inspects the packed public artifact, while Publint verifies package metadata and exported files.

## Work routing

- Update [Rule policy](reference/rule-policy.md) when universal rationale, boundary guidance, or expected replacement changes.
- Update the matching file under `docs/specs/` when a rule needs a detailed source-owned behavioral contract.
- Update [Upgrade Oxlint](runbooks/upgrade-oxlint.md) when that operational procedure changes.
- Update this document when public exports, registry ownership, canonical config composition, build output, or verification boundaries change.
