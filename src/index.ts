import { eslintCompatPlugin } from "@oxlint/plugins";
import type { TSESLint } from "@typescript-eslint/utils";
import pkg from "../package.json" with { type: "json" };
import { consistentBlankLines } from "./rules/consistent-blank-lines.ts";
import { noCallCountOnlyTestRule } from "./rules/no-call-count-only-test.ts";
import { noChainedTypeAssertionsRule } from "./rules/no-chained-type-assertions.ts";
import { noConditionalUndefinedPropertiesRule } from "./rules/no-conditional-undefined-properties.ts";
import { noEnumDeclarationsRule } from "./rules/no-enum-declarations.ts";
import { noImportedConstantRestatementRule } from "./rules/no-imported-constant-restatement.ts";
import { noKnownValueWideningRule } from "./rules/no-known-value-widening.ts";
import { noModuleMockingRule } from "./rules/no-module-mocking.ts";
import { noNegatedThrowAssertionRule } from "./rules/no-negated-throw-assertion.ts";
import { noObjectParametersRule } from "./rules/no-object-parameters.ts";
import { noPositionalBooleanParametersRule } from "./rules/no-positional-boolean-parameters.ts";
import { noPromiseSettlementOnlyAssertionRule } from "./rules/no-promise-settlement-only-assertion.ts";
import { noReflectApplyRule } from "./rules/no-reflect-apply.ts";
import { noReflectGetRule } from "./rules/no-reflect-get.ts";
import { noTestSnapshotsRule } from "./rules/no-test-snapshots.ts";
import { noTruthyFalsyAssertionRule } from "./rules/no-truthy-falsy-assertion.ts";
import { noUncontrolledTimeInTestRule } from "./rules/no-uncontrolled-time-in-test.ts";
import { noUnhandledDetachedPromisesRule } from "./rules/no-unhandled-detached-promises.ts";
import { noUnknownParametersRule } from "./rules/no-unknown-parameters.ts";
import { noUnknownReturnsRule } from "./rules/no-unknown-returns.ts";
import { noUnknownTypeAliasesRule } from "./rules/no-unknown-type-aliases.ts";
import { noUnsafeDictionaryTypeRule } from "./rules/no-unsafe-dictionary-type.ts";
import { noWidenThenAssertRule } from "./rules/no-widen-then-assert.ts";
import { preferForwardedPropsOrderRule } from "./rules/prefer-forwarded-props-order.ts";
import { preferHookOrderRule } from "./rules/prefer-hook-order.ts";
import { preferJsxBooleanAndRule } from "./rules/prefer-jsx-boolean-and.ts";
import { preferOptionsParameterRule } from "./rules/prefer-options-parameter.ts";
import { preferReactPropsReferenceRule } from "./rules/prefer-react-props-reference.ts";
import { preferSwitchDiscriminatorChainRule } from "./rules/prefer-switch-discriminator-chain.ts";
import { preferTopLevelFunctionDeclarationsRule } from "./rules/prefer-top-level-function-declarations.ts";
import { requireLintSuppressionReasonRule } from "./rules/require-lint-suppression-reason.ts";
import { requireRepositoryTestSubjectRule } from "./rules/require-repository-test-subject.ts";
import { requireSafetyCommentForTypeAssertionRule } from "./rules/require-safety-comment-for-type-assertion.ts";
import { requireSpecialCommentTagRule } from "./rules/require-special-comment-tag.ts";

const meta = {
  name: "@utilfirst/eslint-plugin",
  version: pkg.version,
} as const;

const antiSlopPlugin = eslintCompatPlugin({
  meta,
  rules: {
    "no-call-count-only-test": noCallCountOnlyTestRule,
    "no-chained-type-assertions": noChainedTypeAssertionsRule,
    "no-conditional-undefined-properties": noConditionalUndefinedPropertiesRule,
    "no-enum-declarations": noEnumDeclarationsRule,
    "no-imported-constant-restatement": noImportedConstantRestatementRule,
    "no-known-value-widening": noKnownValueWideningRule,
    "no-module-mocking": noModuleMockingRule,
    "no-negated-throw-assertion": noNegatedThrowAssertionRule,
    "no-object-parameters": noObjectParametersRule,
    "no-positional-boolean-parameters": noPositionalBooleanParametersRule,
    "no-promise-settlement-only-assertion":
      noPromiseSettlementOnlyAssertionRule,
    "no-reflect-apply": noReflectApplyRule,
    "no-reflect-get": noReflectGetRule,
    "no-test-snapshots": noTestSnapshotsRule,
    "no-truthy-falsy-assertion": noTruthyFalsyAssertionRule,
    "no-uncontrolled-time-in-test": noUncontrolledTimeInTestRule,
    "no-unknown-parameters": noUnknownParametersRule,
    "no-unknown-returns": noUnknownReturnsRule,
    "no-unknown-type-aliases": noUnknownTypeAliasesRule,
    "no-unsafe-dictionary-type": noUnsafeDictionaryTypeRule,
    "no-unhandled-detached-promises": noUnhandledDetachedPromisesRule,
    "no-widen-then-assert": noWidenThenAssertRule,
    "prefer-forwarded-props-order": preferForwardedPropsOrderRule,
    "prefer-hook-order": preferHookOrderRule,
    "prefer-jsx-boolean-and": preferJsxBooleanAndRule,
    "prefer-options-parameter": preferOptionsParameterRule,
    "prefer-react-props-reference": preferReactPropsReferenceRule,
    "prefer-switch-discriminator-chain": preferSwitchDiscriminatorChainRule,
    "prefer-top-level-function-declarations":
      preferTopLevelFunctionDeclarationsRule,
    "require-lint-suppression-reason": requireLintSuppressionReasonRule,
    "require-repository-test-subject": requireRepositoryTestSubjectRule,
    "require-safety-comment-for-type-assertion":
      requireSafetyCommentForTypeAssertionRule,
    "require-special-comment-tag": requireSpecialCommentTagRule,
  },
});

function assertEslintCompatibleRules(
  candidateRules: typeof antiSlopPlugin.rules,
): asserts candidateRules is typeof antiSlopPlugin.rules &
  Record<string, TSESLint.RuleModule<string>> {
  for (const candidateRule of Object.values(candidateRules)) {
    if (candidateRule.create === undefined) {
      throw new Error("ESLint compatibility adapter did not install `create`");
    }
  }
}

// `eslintCompatPlugin` mutates each `createOnce` rule before this public
// registry crosses the ESLint boundary, but its return type omits that fact.
assertEslintCompatibleRules(antiSlopPlugin.rules);

const antiSlopRules = antiSlopPlugin.rules;

type RuleRegistry = Record<string, TSESLint.RuleModule<string>>;

const rules = {
  "consistent-blank-lines": consistentBlankLines,
  ...antiSlopRules,
};

const recommendedRules: NonNullable<TSESLint.FlatConfig.Config["rules"]> =
  Object.fromEntries(
    Object.keys(rules).map((ruleName) => [
      `utilfirst/${ruleName}`,
      "error" as const,
    ]),
  );

type UtilfirstPlugin = {
  meta: typeof meta;
  rules: RuleRegistry;
  configs: { recommended: TSESLint.FlatConfig.Config };
};

const plugin: UtilfirstPlugin = {
  meta,
  rules,
  configs: { recommended: {} },
};

plugin.configs.recommended = {
  plugins: { utilfirst: plugin },
  rules: recommendedRules,
};

export default plugin;
