import { defineRule } from "@oxlint/plugins";

const suppressionDirectivePattern =
  /^(?:eslint|oxlint)-disable(?:-next-line|-line)?(?:\s|$)/u;

const suppressionReasonPattern = /\s--\s+\S/u;

/** Require an explicit forcing reason on ESLint and Oxlint suppressions. */
export const requireLintSuppressionReasonRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require ESLint and Oxlint disable directives to state their forcing reason.",
    },
    messages: {
      missingReason:
        "Add a reason after `--` that explains why this lint suppression is required.",
    },
  },
  createOnce(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const directive = comment.value.trim();
          if (
            suppressionDirectivePattern.test(directive) &&
            !suppressionReasonPattern.test(directive)
          ) {
            context.report({
              loc: context.sourceCode.getLoc(comment),
              messageId: "missingReason",
            });
          }
        }
      },
    };
  },
});
