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

/** Prefer literal unions or constant objects over runtime TypeScript enums. */
export const noEnumDeclarationsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow runtime enum declarations while preserving const and ambient enums.",
    },
    messages: {
      enumDeclaration:
        "Replace this runtime enum with a literal union or an inferred constant object. Keep const or ambient enums only when their boundary requires them.",
    },
  },
  create(context) {
    const isDeclarationFile = context.filename.endsWith(".d.ts");

    return {
      TSEnumDeclaration(node) {
        if (
          !node.const &&
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
