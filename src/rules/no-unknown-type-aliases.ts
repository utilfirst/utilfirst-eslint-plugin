import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

import { resolveTypeAlias } from "../shared/type-alias.ts";

function referencedAliasName(type: ESTree.TSType): string | null {
  if (type.type === "TSParenthesizedType") {
    return referencedAliasName(type.typeAnnotation);
  }
  if (type.type !== "TSTypeReference" || type.typeName.type !== "Identifier") {
    return null;
  }

  return (type.typeArguments?.params.length ?? 0) === 0
    ? type.typeName.name
    : null;
}

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
    const resolvesToUnknown = (
      type: ESTree.TSType,
      visited = new Set<string>(),
    ): boolean => {
      if (type.type === "TSUnknownKeyword") {
        return true;
      }
      if (type.type === "TSParenthesizedType") {
        return resolvesToUnknown(type.typeAnnotation, visited);
      }

      const name = referencedAliasName(type);
      if (name === null || visited.has(name)) {
        return false;
      }

      const alias =
        type.type === "TSTypeReference"
          ? resolveTypeAlias(context.sourceCode, type)
          : null;

      if (alias === null || (alias.typeParameters?.params.length ?? 0) > 0) {
        return false;
      }

      const nextVisited = new Set([...visited, name]);
      return resolvesToUnknown(alias.typeAnnotation, nextVisited);
    };

    return {
      TSTypeAliasDeclaration(node) {
        if (!resolvesToUnknown(node.typeAnnotation, new Set([node.id.name]))) {
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
