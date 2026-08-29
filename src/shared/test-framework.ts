import type { ESTree, SourceCode } from "@oxlint/plugins";
import { resolveVariable } from "./scope.ts";

const testFrameworkSources = new Set(["@jest/globals", "vitest"]);
const testCaseNames = new Set(["it", "test"]);
const expectationNames = new Set(["expect"]);

export function staticMemberName(
  expression: ESTree.MemberExpression,
): string | null {
  if (!expression.computed && expression.property.type === "Identifier") {
    return expression.property.name;
  }
  if (
    expression.computed &&
    expression.property.type === "Literal" &&
    typeof expression.property.value === "string"
  ) {
    return expression.property.value;
  }

  return null;
}

function importedName(node: ESTree.Node): string | null {
  if (node.type !== "ImportSpecifier") {
    return null;
  }

  return node.imported.type === "Identifier"
    ? node.imported.name
    : node.imported.value;
}

function isTestFrameworkIdentifier({
  acceptedNames,
  identifier,
  sourceCode,
}: {
  acceptedNames: ReadonlySet<string>;
  identifier: ESTree.IdentifierReference;
  sourceCode: SourceCode;
}): boolean {
  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null || variable.defs.length === 0) {
    return acceptedNames.has(identifier.name);
  }

  return variable.defs.some((definition) => {
    if (
      definition.type !== "ImportBinding" ||
      definition.parent?.type !== "ImportDeclaration" ||
      !testFrameworkSources.has(definition.parent.source.value)
    ) {
      return false;
    }

    const name = importedName(definition.node);
    return name !== null && acceptedNames.has(name);
  });
}

function rootCalleeIdentifier(
  expression: ESTree.Expression | ESTree.Super,
): ESTree.IdentifierReference | null {
  if (expression.type === "Identifier") {
    return expression;
  }
  if (expression.type === "MemberExpression") {
    return rootCalleeIdentifier(expression.object);
  }
  if (
    expression.type === "CallExpression" &&
    expression.callee.type !== "Super" &&
    expression.callee.type !== "V8IntrinsicExpression"
  ) {
    return rootCalleeIdentifier(expression.callee);
  }

  return null;
}

export function isTestCaseCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (!node.arguments.some((argument) => isFunction(argument))) {
    return false;
  }
  if (
    node.callee.type === "Super" ||
    node.callee.type === "V8IntrinsicExpression"
  ) {
    return false;
  }

  const rootIdentifier = rootCalleeIdentifier(node.callee);

  return (
    rootIdentifier !== null &&
    isTestFrameworkIdentifier({
      acceptedNames: testCaseNames,
      identifier: rootIdentifier,
      sourceCode,
    })
  );
}

function isFunction(argument: ESTree.Argument | ESTree.SpreadElement): boolean {
  return (
    argument.type === "ArrowFunctionExpression" ||
    argument.type === "FunctionExpression"
  );
}

export function isExpectationMatcher(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (node.callee.type !== "MemberExpression") {
    return false;
  }

  let expression: ESTree.Expression = node.callee.object;
  while (expression.type === "MemberExpression") {
    expression = expression.object;
  }

  if (
    expression.type !== "CallExpression" ||
    expression.callee.type !== "Identifier"
  ) {
    return false;
  }

  return isTestFrameworkIdentifier({
    acceptedNames: expectationNames,
    identifier: expression.callee,
    sourceCode,
  });
}

export function isExpectationMemberCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (
    node.callee.type !== "MemberExpression" ||
    node.callee.object.type !== "Identifier"
  ) {
    return false;
  }

  return isTestFrameworkIdentifier({
    acceptedNames: expectationNames,
    identifier: node.callee.object,
    sourceCode,
  });
}
