import { defineRule } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";

/** Require React types to come from a named type import instead of the ambient React namespace. */
export const preferNamedReactTypeImportsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require named type imports from react instead of types qualified by the ambient React namespace.",
    },
    messages: {
      namespaceType:
        'Import `{{name}}` with `import type { {{name}} } from "react"` instead of qualifying it through the ambient `React` namespace.',
    },
  },
  createOnce(context) {
    return {
      TSQualifiedName(node) {
        if (node.left.type !== "Identifier" || node.left.name !== "React") {
          return;
        }

        // A module-local `React` binding owns the qualified name. Only the
        // ambient UMD namespace hides the type's dependency.
        const variable = resolveVariable(context.sourceCode, node.left);
        if (variable !== null && variable.defs.length > 0) {
          return;
        }

        context.report({
          node,
          messageId: "namespaceType",
          data: { name: node.right.name },
        });
      },
    };
  },
});
