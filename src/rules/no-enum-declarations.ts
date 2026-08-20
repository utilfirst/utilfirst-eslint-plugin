import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

function isInsideAmbientModule(node: ESTree.TSEnumDeclaration): boolean {
  let current: ESTree.Node = node.parent;
  while (current.type !== "Program") {
    if (current.type === "TSModuleDeclaration" && current.declare) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

/** Prefer literal unions or constant objects over repository-owned TypeScript enums. */
export const noEnumDeclarationsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow repository-owned enum declarations while preserving ambient enums.",
    },
    messages: {
      enumDeclaration:
        "Replace this enum with a literal union or an inferred constant object. Keep ambient enums only when their boundary requires them.",
    },
  },
  create(context) {
    const isDeclarationFile = /\.d\.[cm]?ts$/u.test(context.filename);

    return {
      TSEnumDeclaration(node) {
        if (
          !node.declare &&
          !isDeclarationFile &&
          !isInsideAmbientModule(node)
        ) {
          context.report({ node, messageId: "enumDeclaration" });
        }
      },
    };
  },
});
