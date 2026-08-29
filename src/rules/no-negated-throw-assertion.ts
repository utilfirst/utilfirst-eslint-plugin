import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import {
  isExpectationMatcher,
  staticMemberName,
} from "../shared/test-framework.ts";

const throwMatchers = new Set(["toThrow", "toThrowError"]);

function hasNotModifier(expression: ESTree.Expression): boolean {
  let currentExpression = expression;
  while (currentExpression.type === "MemberExpression") {
    if (staticMemberName(currentExpression) === "not") {
      return true;
    }

    currentExpression = currentExpression.object;
  }

  return false;
}

/** Require direct execution instead of redundant non-throw assertions. */
export const noNegatedThrowAssertionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow negated throw assertions because direct execution already fails on an exception.",
    },
    messages: {
      negatedThrow:
        "Invoke this function directly, then assert its observable result or effect.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          !isExpectationMatcher(context.sourceCode, node) ||
          !throwMatchers.has(staticMemberName(node.callee) ?? "") ||
          !hasNotModifier(node.callee.object)
        ) {
          return;
        }

        context.report({ node, messageId: "negatedThrow" });
      },
    };
  },
});
