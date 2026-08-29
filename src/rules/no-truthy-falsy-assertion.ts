import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { nodeAssertCall } from "../shared/node-assert.ts";
import {
  isExpectationMatcher,
  staticMemberName,
} from "../shared/test-framework.ts";

const truthinessMatchers = new Set(["toBeFalsy", "toBeTruthy"]);

function isBareNodeTruthinessSubject(expression: ESTree.Expression): boolean {
  let currentExpression = expression;
  while (
    currentExpression.type === "ChainExpression" ||
    currentExpression.type === "ParenthesizedExpression" ||
    currentExpression.type === "TSAsExpression" ||
    currentExpression.type === "TSNonNullExpression" ||
    currentExpression.type === "TSSatisfiesExpression" ||
    currentExpression.type === "TSTypeAssertion"
  ) {
    currentExpression = currentExpression.expression;
  }

  return (
    currentExpression.type === "Identifier" ||
    currentExpression.type === "MemberExpression"
  );
}

/** Require exact expected values instead of truthiness assertions. */
export const noTruthyFalsyAssertionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow truthiness assertions because they discard value and type information.",
    },
    messages: {
      truthiness:
        "Assert the exact expected value instead of relying on truthiness.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const assertion = nodeAssertCall(context.sourceCode, node);
        const [subject] = assertion?.arguments ?? [];
        if (
          assertion?.methodName === "ok" &&
          subject !== undefined &&
          subject.type !== "SpreadElement" &&
          isBareNodeTruthinessSubject(subject)
        ) {
          context.report({ node, messageId: "truthiness" });
          return;
        }
        if (
          node.callee.type !== "MemberExpression" ||
          !isExpectationMatcher(context.sourceCode, node) ||
          !truthinessMatchers.has(staticMemberName(node.callee) ?? "")
        ) {
          return;
        }

        context.report({ node, messageId: "truthiness" });
      },
    };
  },
});
