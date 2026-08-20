import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

function isFunctionExpression(node: ESTree.Expression): boolean {
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  ) {
    return true;
  }
  if (
    node.type === "ParenthesizedExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSTypeAssertion"
  ) {
    return isFunctionExpression(node.expression);
  }

  return false;
}

function isTopLevelVariable(
  node: ESTree.VariableDeclarator,
): node is ESTree.VariableDeclarator & { id: ESTree.BindingIdentifier } {
  if (node.id.type !== "Identifier") {
    return false;
  }

  const declaration = node.parent;
  if (declaration.type !== "VariableDeclaration") {
    return false;
  }

  return (
    declaration.parent.type === "Program" ||
    (declaration.parent.type === "ExportNamedDeclaration" &&
      declaration.parent.parent.type === "Program")
  );
}

/** Prefer hoistable declarations for repository-owned top-level functions. */
export const preferTopLevelFunctionDeclarationsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require function declarations for direct top-level function bindings and named default exports.",
    },
    messages: {
      anonymousDefaultExport:
        "Name this default-exported function with a function declaration so stack frames and searches identify its owner.",
      topLevelBinding:
        "Top-level function `{{functionName}}` uses a function expression. Replace it with a function declaration so its owner is explicit and hoistable.",
    },
  },
  createOnce(context) {
    return {
      ExportDefaultDeclaration(node) {
        if (
          node.declaration.type === "ArrowFunctionExpression" ||
          node.declaration.type === "FunctionExpression" ||
          (node.declaration.type === "FunctionDeclaration" &&
            node.declaration.id === null) ||
          ((node.declaration.type === "ParenthesizedExpression" ||
            node.declaration.type === "TSAsExpression" ||
            node.declaration.type === "TSNonNullExpression" ||
            node.declaration.type === "TSSatisfiesExpression" ||
            node.declaration.type === "TSTypeAssertion") &&
            isFunctionExpression(node.declaration))
        ) {
          context.report({ node, messageId: "anonymousDefaultExport" });
        }
      },
      VariableDeclarator(node) {
        if (
          node.init === null ||
          !isTopLevelVariable(node) ||
          !isFunctionExpression(node.init)
        ) {
          return;
        }

        context.report({
          node,
          messageId: "topLevelBinding",
          data: { functionName: node.id.name },
        });
      },
    };
  },
});
