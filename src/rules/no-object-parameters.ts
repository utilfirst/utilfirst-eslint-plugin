import { defineRule } from "@oxlint/plugins";

import type { ESTree, SourceCode } from "@oxlint/plugins";

import { lexicalTypeParameterNames } from "../shared/lexical-type-parameters.ts";
import { resolvedTypeIncludesMatch } from "../shared/type-alias.ts";

type Parameter = ESTree.ParamPattern;

type ParameterOwner =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

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

function parameterName(parameter: Parameter, sourceCode: SourceCode): string {
  return parameter.type === "Identifier"
    ? parameter.name
    : sourceCode.getText(parameter).replace(/\s*:\s*object\s*$/u, "");
}

/** Ban the broad object type on function inputs, including local aliases to object. */
export const noObjectParametersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow object function parameters; inputs must use an owner-provided type and be parsed at their boundary.",
    },
    messages: {
      objectParameter:
        "Parameter `{{parameter}}` uses the broad `object` type. Accept a named owner type; parse external input at its boundary before calling this function.",
    },
  },
  createOnce(context) {
    const checkParameters = (node: ParameterOwner) => {
      const shadowedAliases = lexicalTypeParameterNames(
        node,
        context.sourceCode.visitorKeys,
      );

      for (const parameter of node.params) {
        const type = parameterType(parameter);
        if (type === null) {
          continue;
        }
        if (
          !resolvedTypeIncludesMatch({
            isMatch: (candidate) => candidate.type === "TSObjectKeyword",
            shadowedTypeNames: shadowedAliases,
            sourceCode: context.sourceCode,
            type,
          })
        ) {
          continue;
        }

        context.report({
          node: type,
          messageId: "objectParameter",
          data: { parameter: parameterName(parameter, context.sourceCode) },
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
