import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

import { isBoundaryDecoder } from "../shared/boundary-decoder.ts";
import { ruleContextOptionsSchema } from "../shared/rule-options.ts";

type Parameter = ESTree.ParamPattern;

type ParameterOwner =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

const OptionsSchema = z.object({
  allowParameterNames: z.array(z.string()).optional(),
});

const ContextOptionsSchema = ruleContextOptionsSchema(OptionsSchema);

function parameterAnnotation(
  parameter: Parameter,
): ESTree.TSTypeAnnotation | null | undefined {
  if (parameter.type === "TSParameterProperty") {
    return parameterAnnotation(parameter.parameter);
  }
  if (parameter.type === "RestElement") {
    return parameter.typeAnnotation ?? parameterAnnotation(parameter.argument);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameter.left.typeAnnotation;
  }

  return parameter.typeAnnotation;
}

function parameterType(parameter: Parameter): ESTree.TSType | null {
  const annotation = parameterAnnotation(parameter);
  if (annotation === null || annotation === undefined) {
    return null;
  }

  const type = annotation.typeAnnotation;

  return parameter.type === "RestElement" && type.type === "TSArrayType"
    ? type.elementType
    : type;
}

function parameterName(parameter: Parameter, sourceText: string): string {
  if (parameter.type === "TSParameterProperty") {
    return parameterName(parameter.parameter, sourceText);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameterName(parameter.left, sourceText);
  }
  if (parameter.type === "RestElement") {
    return parameterName(parameter.argument, sourceText);
  }

  return parameter.type === "Identifier"
    ? parameter.name
    : sourceText.replace(/\s*:\s*unknown\s*$/u, "");
}

/** Keep unknown inputs at explicit decoding and error-enrichment boundaries. */
export const noUnknownParametersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explicitly unknown parameters outside decoders and error-cause enrichment boundaries.",
    },
    messages: {
      unknownParameter:
        "Parameter `{{parameter}}` leaves input unparsed. Accept a named domain type; run the expected schema or parser at the I/O boundary before calling this function.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowParameterNames: {
            type: "array",
            items: { type: "string", minLength: 1 },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowParameterNames: [] }],
  },
  createOnce(context) {
    const checkParameters = (node: ParameterOwner) => {
      if (isBoundaryDecoder(node)) {
        return;
      }

      const parsedOptions = ContextOptionsSchema.safeParse(context.options);
      const options = parsedOptions.success ? parsedOptions.data : undefined;
      for (const parameter of node.params) {
        const type = parameterType(parameter);
        if (type?.type !== "TSUnknownKeyword") {
          continue;
        }

        const name = parameterName(
          parameter,
          context.sourceCode.getText(parameter),
        );

        if (
          name === "cause" ||
          options?.allowParameterNames?.includes(name) === true
        ) {
          continue;
        }

        context.report({
          node: type,
          messageId: "unknownParameter",
          data: { parameter: name },
        });
      }
    };

    return {
      ArrowFunctionExpression: checkParameters,
      FunctionDeclaration: checkParameters,
      FunctionExpression: checkParameters,
      TSCallSignatureDeclaration: checkParameters,
      TSConstructSignatureDeclaration: checkParameters,
      TSConstructorType: checkParameters,
      TSDeclareFunction: checkParameters,
      TSEmptyBodyFunctionExpression: checkParameters,
      TSFunctionType: checkParameters,
      TSMethodSignature: checkParameters,
    };
  },
});
