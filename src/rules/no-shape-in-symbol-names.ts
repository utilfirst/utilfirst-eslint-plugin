import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const FORBIDDEN_SYMBOL_NAME = "shape";

function containsForbiddenSymbolName(name: string): boolean {
  return name.toLowerCase().includes(FORBIDDEN_SYMBOL_NAME);
}

function isStaticMemberProperty(node: ESTree.Node & { name: string }): boolean {
  const { parent } = node;

  return (
    parent !== null &&
    parent.type === "MemberExpression" &&
    parent.property === node &&
    !parent.computed
  );
}

/** Ban "shape" in repository-owned JavaScript and TypeScript symbol names. */
export const noForbiddenTermInSymbolNamesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow "shape" in JavaScript, TypeScript, private, and JSX symbol names while preserving static property names.',
    },
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "shape" describes structure rather than ownership.',
    },
  },
  createOnce(context) {
    const reportForbiddenSymbolName = (
      node: ESTree.Node & { name: string },
    ) => {
      if (!containsForbiddenSymbolName(node.name)) {
        return;
      }

      context.report({
        node,
        messageId: "forbiddenSymbolName",
        data: { name: node.name },
      });
    };

    return {
      Identifier(node) {
        if (isStaticMemberProperty(node)) {
          return;
        }

        reportForbiddenSymbolName(node);
      },
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
