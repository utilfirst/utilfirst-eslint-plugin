import { defineRule } from "@oxlint/plugins";
import {
  isExpectationMatcher,
  staticMemberName,
} from "../shared/test-framework.ts";

const truthinessMatchers = new Set(["toBeFalsy", "toBeTruthy"]);

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
