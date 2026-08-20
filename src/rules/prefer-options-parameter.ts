import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

import {
  getOwnedFunctionName,
  type OwnedFunction,
} from "../shared/owned-function.ts";

const OptionsSchema = z.object({
  allowFunctionNames: z.array(z.string()).optional(),
});

const ContextOptionsSchema = z
  .union([OptionsSchema, z.array(OptionsSchema)])
  .nullable();

/** Require repository-owned named callables with 3+ inputs to use options. */
export const preferOptionsParameterRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require repository-owned named callables with three or more inputs to use one options object.",
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
      const functionName = getOwnedFunctionName(node);

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
