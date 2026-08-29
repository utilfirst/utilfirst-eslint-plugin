import { defineRule } from "@oxlint/plugins";

const SPECIAL_TAG = /^\s*(fixme|hack|note|todo)\b(?!:)/iu;

/** Require canonical uppercase tags and a colon on special comments. */
export const requireSpecialCommentTagRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require canonical uppercase tags and a colon on special comments.",
    },
    fixable: "code",
    messages: {
      invalidTag:
        "Write the special comment tag as `{{tag}}:` before its context.",
    },
  },
  createOnce(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const match = SPECIAL_TAG.exec(comment.value);
          if (match?.[1] === undefined) {
            continue;
          }

          const matchedTag = match[1];
          const tag = matchedTag.toUpperCase();

          const leadingLength =
            comment.value.length - comment.value.trimStart().length;

          context.report({
            loc: {
              start: comment.loc.start,
              end: comment.loc.end,
            },
            messageId: "invalidTag",
            data: { tag },
            fix(fixer) {
              const start = comment.range[0] + 2 + leadingLength;

              return fixer.replaceTextRange(
                [start, start + matchedTag.length],
                `${tag}:`,
              );
            },
          });
        }
      },
    };
  },
});
