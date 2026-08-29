import { defineRule } from "@oxlint/plugins";
import { staticMemberName } from "../shared/estree.ts";
import { nodeAssertCall } from "../shared/node-assert.ts";
import {
  hasExpectationModifier,
  isExpectationMatcher,
} from "../shared/test-framework.ts";

const throwMatchers = new Set(["toThrow", "toThrowError"]);
const nodeNegatedThrowMethods = new Set(["doesNotReject", "doesNotThrow"]);

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
        const assertion = nodeAssertCall(context.sourceCode, node);
        if (
          assertion !== null &&
          nodeNegatedThrowMethods.has(assertion.methodName)
        ) {
          context.report({ node, messageId: "negatedThrow" });
          return;
        }
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
