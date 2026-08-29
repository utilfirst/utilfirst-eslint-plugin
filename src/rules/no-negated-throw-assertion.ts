import { defineRule } from "@oxlint/plugins";
import {
  hasExpectationModifier,
  isExpectationMatcher,
  staticMemberName,
} from "../shared/test-framework.ts";

const throwMatchers = new Set(["toThrow", "toThrowError"]);

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
          !hasExpectationModifier(node.callee.object, "not")
        ) {
          return;
        }

        context.report({ node, messageId: "negatedThrow" });
      },
    };
  },
});
