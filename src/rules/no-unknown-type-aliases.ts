import { defineRule } from "@oxlint/plugins";

import { lexicalTypeParameterNames } from "../shared/lexical-type-parameters.ts";
import { resolvedTypeIncludesMatch } from "../shared/type-alias.ts";

/** Ban named aliases that merely conceal TypeScript's unknown top type. */
export const noUnknownTypeAliasesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow type aliases whose resolved type is unknown; unknown must remain visible at an allowed boundary.",
    },
    messages: {
      unknownAlias:
        "Type alias `{{alias}}` hides `unknown`. Keep `unknown` explicit at the parsing boundary or on an allowed `cause` field; otherwise use the parsed owner type.",
    },
  },
  createOnce(context) {
    return {
      TSTypeAliasDeclaration(node) {
        if (
          !resolvedTypeIncludesMatch({
            isMatch: (type) => type.type === "TSUnknownKeyword",
            shadowedTypeNames: lexicalTypeParameterNames(
              node,
              context.sourceCode.visitorKeys,
            ),
            sourceCode: context.sourceCode,
            type: node.typeAnnotation,
          })
        ) {
          return;
        }

        context.report({
          node: node.id,
          messageId: "unknownAlias",
          data: { alias: node.id.name },
        });
      },
    };
  },
});
