import { defineRule } from "@oxlint/plugins";
import { nodeAssertCall } from "../shared/node-assert.ts";
import {
  getTestFrameworkCall,
  isExpectationMatcher,
  staticMemberName,
  visitExecutedNodes,
} from "../shared/test-framework.ts";

const interactionMatchers = new Set([
  "toBeCalled",
  "toBeCalledTimes",
  "toHaveBeenCalled",
  "toHaveBeenCalledOnce",
  "toHaveBeenCalledTimes",
]);

/** Require interaction assertions to accompany observable outcome evidence. */
export const noCallCountOnlyTestRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow tests whose assertions only inspect mock call counts or omission.",
    },
    messages: {
      callCountOnly:
        "Assert an observable outcome, or document why call multiplicity or omission is the boundary contract.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const frameworkCall = getTestFrameworkCall(context.sourceCode, node);
        if (frameworkCall?.kind !== "test" || frameworkCall.callback === null) {
          return;
        }

        let assertionCount = 0;
        let interactionCount = 0;
        visitExecutedNodes({
          root: frameworkCall.callback,
          sourceCode: context.sourceCode,
          visit(candidate) {
            if (candidate.type !== "CallExpression") {
              return;
            }
            if (nodeAssertCall(context.sourceCode, candidate) !== null) {
              assertionCount += 1;
              return;
            }
            if (!isExpectationMatcher(context.sourceCode, candidate)) {
              return;
            }

            assertionCount += 1;
            if (
              candidate.callee.type === "MemberExpression" &&
              interactionMatchers.has(staticMemberName(candidate.callee) ?? "")
            ) {
              interactionCount += 1;
            }
          },
        });
        if (assertionCount > 0 && assertionCount === interactionCount) {
          context.report({ node, messageId: "callCountOnly" });
        }
      },
    };
  },
});
