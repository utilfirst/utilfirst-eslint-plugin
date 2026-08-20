import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

const FORBIDDEN_SYMBOL_NAME = "shape";

const OptionsSchema = z.object({
  allowSymbolNames: z.array(z.string()).optional(),
});

const ContextOptionsSchema = z
  .union([OptionsSchema, z.array(OptionsSchema)])
  .nullable();

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
  if (parent.type === "Property" && parent.key === node && !parent.computed) {
    return true;
  }
  if (parent.type === "ImportSpecifier" && parent.imported === node) {
    return true;
  }

  return parent.type === "ExportSpecifier";
}

/** Ban "shape" in repository-owned JavaScript and TypeScript symbol names. */
export const noForbiddenTermInSymbolNamesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow "shape" in repository-owned symbols while preserving protocol-owned property and boundary names.',
    },
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "shape" describes structure rather than ownership.',
    },
    schema: [
      {
        type: "object",
        properties: {
          allowSymbolNames: {
            type: "array",
            items: { type: "string", minLength: 1 },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowSymbolNames: [] }],
  },
  createOnce(context) {
    const protocolOwnedRanges = new Set<number>();
    const reportedRanges = new Set<number>();

    const reportForbiddenSymbolName = (
      node: ESTree.Node & { name: string },
    ) => {
      const parsedOptions = ContextOptionsSchema.safeParse(context.options);

      const options = parsedOptions.success
        ? Array.isArray(parsedOptions.data)
          ? parsedOptions.data[0]
          : parsedOptions.data
        : undefined;

      if (
        protocolOwnedRanges.has(node.range[0]) ||
        reportedRanges.has(node.range[0]) ||
        options?.allowSymbolNames?.includes(node.name) === true ||
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
      Program() {
        protocolOwnedRanges.clear();
        reportedRanges.clear();
      },
      Identifier(node) {
        if (isProtocolOwnedName(node)) {
          return;
        }

        reportForbiddenSymbolName(node);
      },
      ExportSpecifier(node) {
        protocolOwnedRanges.add(node.local.range[0]);
        protocolOwnedRanges.add(node.exported.range[0]);
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
        if (!node.computed && node.key.type === "Identifier") {
          protocolOwnedRanges.add(node.key.range[0]);
        }
      },
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
