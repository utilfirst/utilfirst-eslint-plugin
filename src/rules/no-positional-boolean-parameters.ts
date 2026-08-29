import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

import { lexicalTypeParameterNames } from "../shared/lexical-type-parameters.ts";
import {
  getOwnedFunctionName,
  type OwnedCallable,
} from "../shared/owned-function.ts";
import { ruleContextOptionsSchema } from "../shared/rule-options.ts";
import { resolvedTypeIncludesMatch } from "../shared/type-alias.ts";

const OptionsSchema = z.object({
  allowFunctionNames: z.array(z.string()).optional(),
});

const ContextOptionsSchema = ruleContextOptionsSchema(OptionsSchema);

function annotationOf(
  parameter: ESTree.ParamPattern,
): ESTree.TSTypeAnnotation | null | undefined {
  if (parameter.type === "TSParameterProperty") {
    return annotationOf(parameter.parameter);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameter.left.typeAnnotation;
  }

  return parameter.typeAnnotation;
}

function parameterName(
  parameter: ESTree.ParamPattern,
  sourceCode: SourceCode,
): string {
  if (parameter.type === "TSParameterProperty") {
    return parameterName(parameter.parameter, sourceCode);
  }
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
    const checkFunction = (node: OwnedCallable) => {
      const functionName = getOwnedFunctionName(node);
      if (functionName === null) {
        return;
      }

      const rawOptions: unknown = context.options;
      const parsedOptions = ContextOptionsSchema.safeParse(rawOptions);
      const options = parsedOptions.success ? parsedOptions.data : undefined;
      if (options?.allowFunctionNames?.includes(functionName) === true) {
        return;
      }

      for (const parameter of node.params) {
        if (parameter.type === "RestElement") {
          continue;
        }

        const annotation = annotationOf(parameter);
        if (
          annotation === null ||
          annotation === undefined ||
          !resolvedTypeIncludesMatch({
            isMatch: (type) => type.type === "TSBooleanKeyword",
            shadowedTypeNames: lexicalTypeParameterNames(
              node,
              context.sourceCode.visitorKeys,
            ),
            sourceCode: context.sourceCode,
            type: annotation.typeAnnotation,
          })
        ) {
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
      TSCallSignatureDeclaration: checkFunction,
      TSConstructSignatureDeclaration: checkFunction,
      TSConstructorType: checkFunction,
      TSDeclareFunction: checkFunction,
      TSEmptyBodyFunctionExpression: checkFunction,
      TSFunctionType: checkFunction,
      TSMethodSignature: checkFunction,
    };
  },
});
