import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import {
  isExpectationMatcher,
  isTestCaseCall,
  staticMemberName,
} from "../shared/test-framework.ts";

const interactionMatchers = new Set([
  "toBeCalled",
  "toBeCalledTimes",
  "toHaveBeenCalled",
  "toHaveBeenCalledOnce",
  "toHaveBeenCalledTimes",
]);

type TestEvidence = {
  assertionCount: number;
  interactionCount: number;
  node: ESTree.CallExpression;
};

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
    const activeTests: TestEvidence[] = [];

    return {
      "Program"() {
        activeTests.length = 0;
      },
      "CallExpression"(node) {
        if (isTestCaseCall(context.sourceCode, node)) {
          activeTests.push({
            assertionCount: 0,
            interactionCount: 0,
            node,
          });
          return;
        }

        const activeTest = activeTests.at(-1);
        if (
          activeTest === undefined ||
          !isExpectationMatcher(context.sourceCode, node)
        ) {
          return;
        }

        activeTest.assertionCount += 1;
        if (
          node.callee.type === "MemberExpression" &&
          interactionMatchers.has(staticMemberName(node.callee) ?? "")
        ) {
          activeTest.interactionCount += 1;
        }
      },
      "CallExpression:exit"(node) {
        const activeTest = activeTests.at(-1);
        if (activeTest === undefined || activeTest.node !== node) {
          return;
        }

        activeTests.pop();
        if (
          activeTest.assertionCount > 0 &&
          activeTest.assertionCount === activeTest.interactionCount
        ) {
          context.report({ node, messageId: "callCountOnly" });
        }
      },
    };
  },
});
