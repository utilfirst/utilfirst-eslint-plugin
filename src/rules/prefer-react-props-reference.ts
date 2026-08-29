import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

type ComponentFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

function componentNameOf(node: ComponentFunction): string | null {
  if (node.type !== "ArrowFunctionExpression") {
    return node.id?.name ?? null;
  }
  if (
    node.parent.type === "VariableDeclarator" &&
    node.parent.id.type === "Identifier"
  ) {
    return node.parent.id.name;
  }

  return null;
}

function isComponent(node: ComponentFunction): boolean {
  const name = componentNameOf(node);
  return name !== null && /^\p{Lu}/u.test(name);
}

/** Keep React props available through one named component boundary. */
export const preferReactPropsReferenceRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require named React component props instead of signature destructuring.",
    },
    messages: {
      nameProps:
        "Accept one named props parameter and reference fields through it; destructure component-owned fields inside the body when forwarding requires it.",
    },
  },
  createOnce(context) {
    const checkComponent = (node: ComponentFunction) => {
      if (!isComponent(node) || node.params[0]?.type !== "ObjectPattern") {
        return;
      }

      context.report({ node: node.params[0], messageId: "nameProps" });
    };

    return {
      ArrowFunctionExpression: checkComponent,
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
    };
  },
});
