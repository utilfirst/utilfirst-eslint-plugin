import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

type OwnedFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

const OptionsSchema = z.object({
  allowFunctionNames: z.array(z.string()).optional(),
});

const ContextOptionsSchema = z
  .union([OptionsSchema, z.array(OptionsSchema)])
  .nullable();

function ownedFunctionName(node: OwnedFunction): string | null {
  if (node.type === "FunctionDeclaration") {
    return node.id?.name ?? null;
  }
  if (
    (node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionExpression") &&
    node.parent.type === "VariableDeclarator" &&
    node.parent.init === node &&
    node.parent.id.type === "Identifier"
  ) {
    return node.parent.id.name;
  }

  return null;
}

/** Require repository-owned named functions with 3+ inputs to use options. */
export const preferOptionsParameterRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require named function declarations and bindings with three or more inputs to use one options object.",
    },
    messages: {
      preferOptions:
        "Function `{{functionName}}` has {{parameterCount}} parameters. Replace them with one named options object.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowFunctionNames: {
            type: "array",
            items: { type: "string", minLength: 1 },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowFunctionNames: [] }],
  },
  createOnce(context) {
    const checkFunction = (node: OwnedFunction) => {
      const functionName = ownedFunctionName(node);

      const parameterCount = node.params.filter(
        (parameter) =>
          !(parameter.type === "Identifier" && parameter.name === "this"),
      ).length;

      if (functionName === null || parameterCount < 3) {
        return;
      }

      const rawOptions: unknown = context.options;
      const parsedOptions = ContextOptionsSchema.safeParse(rawOptions);

      const options = parsedOptions.success
        ? Array.isArray(parsedOptions.data)
          ? parsedOptions.data[0]
          : parsedOptions.data
        : undefined;

      if (options?.allowFunctionNames?.includes(functionName) === true) {
        return;
      }

      context.report({
        node,
        messageId: "preferOptions",
        data: {
          functionName,
          parameterCount,
        },
      });
    };

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
    };
  },
});
