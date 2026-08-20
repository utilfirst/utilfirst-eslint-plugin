import { eslintCompatPlugin } from "@oxlint/plugins";
import type { TSESLint } from "@typescript-eslint/utils";
import pkg from "../package.json" with { type: "json" };
import { consistentBlankLines } from "./rules/consistent-blank-lines.ts";
import { noChainedTypeAssertionsRule } from "./rules/no-chained-type-assertions.ts";
import { noConditionalEmptyObjectSpreadRule } from "./rules/no-conditional-empty-object-spread.ts";
import { noConditionalUndefinedPropertiesRule } from "./rules/no-conditional-undefined-properties.ts";
import { noEnumDeclarationsRule } from "./rules/no-enum-declarations.ts";
import { noKnownValueWideningRule } from "./rules/no-known-value-widening.ts";
import { noModuleMockingRule } from "./rules/no-module-mocking.ts";
import { noObjectParametersRule } from "./rules/no-object-parameters.ts";
import { noPositionalBooleanParametersRule } from "./rules/no-positional-boolean-parameters.ts";
import { noReflectApplyRule } from "./rules/no-reflect-apply.ts";
import { noReflectGetRule } from "./rules/no-reflect-get.ts";
import { noRuntimeTypeofRule } from "./rules/no-runtime-typeof.ts";
import { noForbiddenTermInSymbolNamesRule } from "./rules/no-shape-in-symbol-names.ts";
import { noUnknownParametersRule } from "./rules/no-unknown-parameters.ts";
import { noUnknownReturnsRule } from "./rules/no-unknown-returns.ts";
import { noUnknownTypeAliasesRule } from "./rules/no-unknown-type-aliases.ts";
import { noUnsafeDictionaryTypeRule } from "./rules/no-unsafe-dictionary-type.ts";
import { noWidenThenAssertRule } from "./rules/no-widen-then-assert.ts";
import { requireSafetyCommentForTypeAssertionRule } from "./rules/require-safety-comment-for-type-assertion.ts";

const meta = {
  name: "@utilfirst/eslint-plugin",
  version: pkg.version,
} as const;

const antiSlopPlugin = eslintCompatPlugin({
  meta,
  rules: {
    "no-chained-type-assertions": noChainedTypeAssertionsRule,
    "no-conditional-empty-object-spread": noConditionalEmptyObjectSpreadRule,
    "no-conditional-undefined-properties": noConditionalUndefinedPropertiesRule,
    "no-enum-declarations": noEnumDeclarationsRule,
    "no-known-value-widening": noKnownValueWideningRule,
    "no-module-mocking": noModuleMockingRule,
    "no-object-parameters": noObjectParametersRule,
    "no-positional-boolean-parameters": noPositionalBooleanParametersRule,
    "no-reflect-apply": noReflectApplyRule,
    "no-reflect-get": noReflectGetRule,
    "no-runtime-typeof": noRuntimeTypeofRule,
    "no-shape-in-symbol-names": noForbiddenTermInSymbolNamesRule,
    "no-unknown-parameters": noUnknownParametersRule,
    "no-unknown-returns": noUnknownReturnsRule,
    "no-unknown-type-aliases": noUnknownTypeAliasesRule,
    "no-unsafe-dictionary-type": noUnsafeDictionaryTypeRule,
    "no-widen-then-assert": noWidenThenAssertRule,
    "require-safety-comment-for-type-assertion":
      requireSafetyCommentForTypeAssertionRule,
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
