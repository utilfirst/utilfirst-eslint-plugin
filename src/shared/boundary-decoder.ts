import type { ESTree } from "@oxlint/plugins";

type BoundaryFunction = {
  params: ESTree.ParamPattern[];
  returnType?: ESTree.TSTypeAnnotation | null;
};

function parameterType(parameter: ESTree.ParamPattern): ESTree.TSType | null {
  if (parameter.type === "TSParameterProperty") {
    return parameterType(parameter.parameter);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameterType(parameter.left);
  }
  if (parameter.type === "RestElement") {
    const annotation = parameter.typeAnnotation;
    if (annotation?.typeAnnotation.type === "TSArrayType") {
      return annotation.typeAnnotation.elementType;
    }

    return parameterType(parameter.argument);
  }

  return parameter.typeAnnotation?.typeAnnotation ?? null;
}

function hasDecodedReturnType(owner: BoundaryFunction): boolean {
  const returnType = owner.returnType?.typeAnnotation;
  if (returnType === undefined) {
    return false;
  }

  return ![
    "TSAnyKeyword",
    "TSUndefinedKeyword",
    "TSUnknownKeyword",
    "TSVoidKeyword",
  ].includes(returnType.type);
}

/** Identify a boundary that converts an explicitly untrusted input into a typed result. */
export function isBoundaryDecoder(owner: BoundaryFunction): boolean {
  return (
    owner.params.some(
      (parameter) => parameterType(parameter)?.type === "TSUnknownKeyword",
    ) && hasDecodedReturnType(owner)
  );
}
