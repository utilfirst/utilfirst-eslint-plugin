import type { ESTree, SourceCode } from "@oxlint/plugins";
import { resolveVariable } from "./scope.ts";

type BoundaryFunction = {
  body?: ESTree.Expression | ESTree.FunctionBody | null;
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

function bindingIdentifiers(
  parameter: ESTree.ParamPattern,
): ESTree.BindingIdentifier[] {
  if (parameter.type === "Identifier") {
    return [parameter];
  }
  if (parameter.type === "TSParameterProperty") {
    return bindingIdentifiers(parameter.parameter);
  }
  if (parameter.type === "AssignmentPattern") {
    return bindingIdentifiers(parameter.left);
  }
  if (parameter.type === "RestElement") {
    return bindingIdentifiers(parameter.argument);
  }
  if (parameter.type === "ArrayPattern") {
    return parameter.elements.flatMap((element) =>
      element === null ? [] : bindingIdentifiers(element),
    );
  }

  return parameter.properties.flatMap((property) =>
    property.type === "Property"
      ? bindingIdentifiers(property.value)
      : bindingIdentifiers(property.argument),
  );
}

function executableBody(owner: BoundaryFunction): ESTree.Node | null {
  return owner.body ?? null;
}

function readsParameter({
  owner,
  parameter,
  sourceCode,
}: {
  owner: BoundaryFunction;
  parameter: ESTree.ParamPattern;
  sourceCode: SourceCode;
}): boolean {
  const body = executableBody(owner);
  if (body === null) {
    return false;
  }

  return bindingIdentifiers(parameter).some((identifier) => {
    const variable = resolveVariable(sourceCode, identifier);

    return (
      variable?.references.some(
        (reference) =>
          reference.isRead() &&
          reference.identifier.range[0] >= body.range[0] &&
          reference.identifier.range[1] <= body.range[1],
      ) === true
    );
  });
}

/** Identify a boundary that converts an explicitly untrusted input into a typed result. */
export function isBoundaryDecoder({
  owner,
  parameter,
  sourceCode,
}: {
  owner: BoundaryFunction;
  parameter: ESTree.ParamPattern;
  sourceCode: SourceCode;
}): boolean {
  return (
    parameterType(parameter)?.type === "TSUnknownKeyword" &&
    hasDecodedReturnType(owner) &&
    (executableBody(owner) === null ||
      readsParameter({ owner, parameter, sourceCode }))
  );
}
