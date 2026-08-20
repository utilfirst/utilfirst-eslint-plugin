import type { ESTree, SourceCode } from "@oxlint/plugins";
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

function annotationOf(
  parameter: ESTree.ParamPattern,
): ESTree.TSTypeAnnotation | null | undefined {
  if (parameter.type === "AssignmentPattern") {
    return parameter.left.typeAnnotation;
  }
  if (parameter.type === "TSParameterProperty") {
    return null;
  }

  return parameter.typeAnnotation;
}

function parameterName(
  parameter: ESTree.ParamPattern,
  sourceCode: SourceCode,
): string {
  if (parameter.type === "AssignmentPattern") {
    return parameter.left.type === "Identifier"
      ? parameter.left.name
      : sourceCode.getText(parameter.left);
  }

  return parameter.type === "Identifier"
    ? parameter.name
    : sourceCode.getText(parameter);
}

/** Disallow positional boolean flags on repository-owned named callables. */
export const noPositionalBooleanParametersRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow explicit boolean parameters on repository-owned named callables.",
    },
    messages: {
      positionalBoolean:
        "Parameter `{{parameter}}` is a positional boolean flag on `{{functionName}}`. Replace it with a named options object.",
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
      if (functionName === null) {
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

      for (const parameter of node.params) {
        if (parameter.type === "RestElement") {
          continue;
        }

        const annotation = annotationOf(parameter);
        if (annotation?.typeAnnotation.type !== "TSBooleanKeyword") {
          continue;
        }

        context.report({
          node: annotation.typeAnnotation,
          messageId: "positionalBoolean",
          data: {
            functionName,
            parameter: parameterName(parameter, context.sourceCode),
          },
        });
      }
    };

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
    };
  },
});
