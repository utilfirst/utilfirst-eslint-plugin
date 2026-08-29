import { defineRule } from "@oxlint/plugins";
import { staticMemberName } from "../shared/estree.ts";
import {
  isExpectationMatcher,
  isExpectationMemberCall,
} from "../shared/test-framework.ts";

const snapshotMatchers = new Set([
  "addSnapshotSerializer",
  "toMatchFileSnapshot",
  "toMatchInlineSnapshot",
  "toMatchSnapshot",
  "toThrowErrorMatchingInlineSnapshot",
  "toThrowErrorMatchingSnapshot",
]);

/** Require explicit assertions instead of stored or inline snapshots. */
export const noTestSnapshotsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow snapshot assertions because they obscure the behavior a test protects.",
    },
    messages: {
      snapshot:
        "Replace this snapshot with explicit assertions for the observable contract.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          (!isExpectationMatcher(context.sourceCode, node) &&
            !isExpectationMemberCall(context.sourceCode, node)) ||
          !snapshotMatchers.has(staticMemberName(node.callee) ?? "")
        ) {
          return;
        }

        context.report({ node, messageId: "snapshot" });
      },
    };
  },
});
