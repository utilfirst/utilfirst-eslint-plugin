import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const FORBIDDEN_SYMBOL_NAME = "shape";

function containsForbiddenSymbolName(name: string): boolean {
  return name.toLowerCase().includes(FORBIDDEN_SYMBOL_NAME);
}

function isProtocolOwnedName(node: ESTree.Node & { name: string }): boolean {
  const { parent } = node;
  if (parent === null) {
    return false;
  }
  if (
    parent.type === "MemberExpression" &&
    parent.property === node &&
    !parent.computed
  ) {
    return true;
  }
  if (parent.type === "JSXAttribute" && parent.name === node) {
    return true;
  }
  if (
    parent.type === "Property" &&
    parent.key === node &&
    !parent.computed &&
    !parent.shorthand
  ) {
    return true;
  }
  if (parent.type === "ImportSpecifier" && parent.imported === node) {
    return true;
  }

  return parent.type === "ExportSpecifier" && parent.local === node;
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
    const protocolOwnedRanges = new Set<number>();
    const reportedRanges = new Set<number>();

    const reportForbiddenSymbolName = (
      node: ESTree.Node & { name: string },
    ) => {
      if (
        protocolOwnedRanges.has(node.range[0]) ||
        reportedRanges.has(node.range[0]) ||
        !containsForbiddenSymbolName(node.name)
      ) {
        return;
      }

      reportedRanges.add(node.range[0]);
      context.report({
        node,
        messageId: "forbiddenSymbolName",
        data: { name: node.name },
      });
    };

    return {
      Identifier(node) {
        if (isProtocolOwnedName(node)) {
          return;
        }

        reportForbiddenSymbolName(node);
      },
      ExportSpecifier(node) {
        protocolOwnedRanges.add(node.local.range[0]);
      },
      ImportSpecifier(node) {
        protocolOwnedRanges.add(node.imported.range[0]);
      },
      JSXAttribute(node) {
        if (node.name.type === "JSXIdentifier") {
          protocolOwnedRanges.add(node.name.range[0]);
        }
      },
      Property(node) {
        if (
          !node.computed &&
          !node.shorthand &&
          node.key.type === "Identifier"
        ) {
          protocolOwnedRanges.add(node.key.range[0]);
        }
      },
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
