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

export function hasExpectationModifier(
  expression: ESTree.Expression | ESTree.Super,
  modifierName: string,
): boolean {
  let currentExpression = expression;
  while (currentExpression.type === "MemberExpression") {
    if (staticMemberName(currentExpression) === modifierName) {
      return true;
    }

    currentExpression = currentExpression.object;
  }

  return false;
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

function isTestFrameworkNamespace(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean {
  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null) {
    return false;
  }

  return variable.defs.some(
    (definition) =>
      definition.type === "ImportBinding" &&
      definition.node.type === "ImportNamespaceSpecifier" &&
      definition.parent?.type === "ImportDeclaration" &&
      testFrameworkSources.has(definition.parent.source.value),
  );
}

function memberChain(
  expression: ESTree.Expression | ESTree.Super,
): { names: string[]; root: ESTree.IdentifierReference } | null {
  if (expression.type === "Identifier") {
    return { names: [], root: expression };
  }
  if (expression.type === "MemberExpression") {
    const parentChain = memberChain(expression.object);

    const memberName = staticMemberName(expression);
    if (parentChain === null || memberName === null) {
      return null;
    }

    return {
      names: [...parentChain.names, memberName],
      root: parentChain.root,
    };
  }
  if (
    expression.type === "CallExpression" &&
    expression.callee.type !== "Super" &&
    expression.callee.type !== "V8IntrinsicExpression"
  ) {
    return memberChain(expression.callee);
  }

  return null;
}

function isTestFrameworkReference({
  acceptedNames,
  expression,
  sourceCode,
}: {
  acceptedNames: ReadonlySet<string>;
  expression: ESTree.Expression | ESTree.Super;
  sourceCode: SourceCode;
}): boolean {
  const chain = memberChain(expression);
  if (chain === null) {
    return false;
  }
  if (
    isTestFrameworkIdentifier({
      acceptedNames,
      identifier: chain.root,
      sourceCode,
    })
  ) {
    return true;
  }

  const [frameworkMember] = chain.names;

  return (
    frameworkMember !== undefined &&
    acceptedNames.has(frameworkMember) &&
    isTestFrameworkNamespace(sourceCode, chain.root)
  );
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

  return isTestFrameworkReference({
    acceptedNames: testCaseNames,
    expression: node.callee,
    sourceCode,
  });
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

  if (expression.type !== "CallExpression") {
    return false;
  }

  return isTestFrameworkReference({
    acceptedNames: expectationNames,
    expression: expression.callee,
    sourceCode,
  });
}

export function isExpectationMemberCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (node.callee.type !== "MemberExpression") {
    return false;
  }

  return isTestFrameworkReference({
    acceptedNames: expectationNames,
    expression: node.callee.object,
    sourceCode,
  });
}
