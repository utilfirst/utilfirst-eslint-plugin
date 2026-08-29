import { defineRule } from "@oxlint/plugins";
import {
  hasExpectationModifier,
  isExpectationMatcher,
  staticMemberName,
} from "../shared/test-framework.ts";

/** Require promise assertions to describe a result or specific failure. */
export const noPromiseSettlementOnlyAssertionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow promise assertions that only prove fulfillment or rejection.",
    },
    messages: {
      fulfillmentOnly:
        "Await this promise directly, then assert its observable result or effect.",
      rejectionOnly:
        "Assert the rejection's class, code, message, or other behavioral contract.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          !isExpectationMatcher(context.sourceCode, node)
        ) {
          return;
        }

        const matcherName = staticMemberName(node.callee);
        if (
          matcherName === "toBeUndefined" &&
          hasExpectationModifier(node.callee.object, "resolves")
        ) {
          context.report({ node, messageId: "fulfillmentOnly" });
          return;
        }

        if (
          matcherName === "toBeDefined" &&
          hasExpectationModifier(node.callee.object, "rejects")
        ) {
          context.report({ node, messageId: "rejectionOnly" });
        }
      },
    };
  },
});
