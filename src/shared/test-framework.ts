import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { staticMemberName } from "./estree.ts";
import { resolveVariable } from "./scope.ts";

const testFrameworkSources = new Set(["@jest/globals", "node:test", "vitest"]);
const testCaseNames = new Set(["it", "test"]);
const testControllerNames = new Set(["jest", "vi"]);
const expectationNames = new Set(["expect"]);

const testHookNames = new Set([
  "afterAll",
  "afterEach",
  "beforeAll",
  "beforeEach",
]);

const testSetupHookNames = new Set(["beforeAll", "beforeEach"]);
const testSuiteNames = new Set(["describe", "suite"]);

type TestCallback = ESTree.ArrowFunctionExpression | ESTree.Function;

type CallbackResolution = {
  callback: TestCallback | null;
  hasCallback: boolean;
};

export type TestFrameworkCall = {
  callback: TestCallback | null;
  kind: "setup-hook" | "suite" | "teardown-hook" | "test";
};

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
  return (
    testFrameworkReferenceName({
      acceptedNames,
      expression,
      sourceCode,
    }) !== null
  );
}

function testFrameworkReferenceName({
  acceptedNames,
  expression,
  sourceCode,
}: {
  acceptedNames: ReadonlySet<string>;
  expression: ESTree.Expression | ESTree.Super;
  sourceCode: SourceCode;
}): string | null {
  const chain = memberChain(expression);
  if (chain === null) {
    return null;
  }

  const variable = resolveVariable(sourceCode, chain.root);
  if (variable === null || variable.defs.length === 0) {
    return acceptedNames.has(chain.root.name) ? chain.root.name : null;
  }

  for (const definition of variable.defs) {
    if (
      definition.type !== "ImportBinding" ||
      definition.parent?.type !== "ImportDeclaration" ||
      !testFrameworkSources.has(definition.parent.source.value)
    ) {
      continue;
    }

    const name = importedName(definition.node);
    if (name !== null && acceptedNames.has(name)) {
      return name;
    }
    if (
      definition.parent.source.value === "node:test" &&
      definition.node.type === "ImportDefaultSpecifier" &&
      acceptedNames.has("test")
    ) {
      return "test";
    }

    if (definition.node.type === "ImportNamespaceSpecifier") {
      const [frameworkMember] = chain.names;
      if (frameworkMember !== undefined && acceptedNames.has(frameworkMember)) {
        return frameworkMember;
      }
    }
  }

  return null;
}

function unwrapExpression(expression: ESTree.Expression): ESTree.Expression {
  let current = expression;
  while (
    current.type === "ChainExpression" ||
    current.type === "ParenthesizedExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSNonNullExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSTypeAssertion"
  ) {
    current = current.expression;
  }

  return current;
}

function isStableVariable(variable: Variable | null): variable is Variable {
  return (
    variable?.references.every(
      (reference) => reference.init || !reference.isWrite(),
    ) ?? false
  );
}

function functionFromIdentifier(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): TestCallback | null {
  const variable = resolveVariable(sourceCode, identifier);
  if (!isStableVariable(variable)) {
    return null;
  }

  for (const definition of variable.defs) {
    if (
      definition.type === "FunctionName" &&
      (definition.node.type === "FunctionDeclaration" ||
        definition.node.type === "FunctionExpression")
    ) {
      return definition.node;
    }

    if (
      definition.type === "Variable" &&
      definition.node.type === "VariableDeclarator" &&
      definition.node.init !== null
    ) {
      const callback = functionFromExpression(sourceCode, definition.node.init);
      if (callback !== null) {
        return callback;
      }
    }
  }

  return null;
}

function functionFromExpression(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): TestCallback | null {
  const unwrapped = unwrapExpression(expression);
  if (
    unwrapped.type === "ArrowFunctionExpression" ||
    unwrapped.type === "FunctionExpression"
  ) {
    return unwrapped;
  }
  if (unwrapped.type === "Identifier") {
    return functionFromIdentifier(sourceCode, unwrapped);
  }

  return null;
}

function callbackFromArguments(
  sourceCode: SourceCode,
  arguments_: ESTree.CallExpression["arguments"],
): CallbackResolution {
  for (let index = arguments_.length - 1; index >= 0; index -= 1) {
    const argument = arguments_[index];
    if (argument === undefined || argument.type === "SpreadElement") {
      continue;
    }

    const callback = functionFromExpression(sourceCode, argument);
    if (callback !== null) {
      return { callback, hasCallback: true };
    }
    if (
      index > 0 &&
      (argument.type === "Identifier" || argument.type === "MemberExpression")
    ) {
      return { callback: null, hasCallback: true };
    }
  }

  return { callback: null, hasCallback: false };
}

export function getTestFrameworkCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): TestFrameworkCall | null {
  if (
    node.callee.type === "Super" ||
    node.callee.type === "V8IntrinsicExpression"
  ) {
    return null;
  }

  const testName = testFrameworkReferenceName({
    acceptedNames: testCaseNames,
    expression: node.callee,
    sourceCode,
  });

  const hookName = testFrameworkReferenceName({
    acceptedNames: testHookNames,
    expression: node.callee,
    sourceCode,
  });

  const suiteName = testFrameworkReferenceName({
    acceptedNames: testSuiteNames,
    expression: node.callee,
    sourceCode,
  });

  if (testName === null && hookName === null && suiteName === null) {
    return null;
  }

  const { callback, hasCallback } = callbackFromArguments(
    sourceCode,
    node.arguments,
  );

  if (!hasCallback) {
    return null;
  }
  if (testName !== null) {
    return { callback, kind: "test" };
  }
  if (suiteName !== null) {
    return { callback, kind: "suite" };
  }

  return {
    callback,
    kind:
      hookName !== null && testSetupHookNames.has(hookName)
        ? "setup-hook"
        : "teardown-hook",
  };
}

function isNode<Value>(value: Value): value is Value & ESTree.Node {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function isArray<Value>(value: Value): value is Value & readonly unknown[] {
  return Array.isArray(value);
}

export function visitExecutedNodes({
  root,
  sourceCode,
  visit,
}: {
  root: ESTree.Program | TestCallback;
  sourceCode: SourceCode;
  visit: (node: ESTree.Node) => void;
}): void {
  const activeFunctions = new Set<TestCallback>();

  const walkFunction = (callback: TestCallback) => {
    if (activeFunctions.has(callback)) {
      return;
    }

    activeFunctions.add(callback);

    for (const parameter of callback.params) {
      walkNode(parameter);
    }

    if (callback.body !== null) {
      walkNode(callback.body);
    }

    activeFunctions.delete(callback);
  };

  const walkNode = (node: ESTree.Node) => {
    if (
      node !== root &&
      (node.type === "ArrowFunctionExpression" ||
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression")
    ) {
      return;
    }

    const frameworkCall =
      node.type === "CallExpression"
        ? getTestFrameworkCall(sourceCode, node)
        : null;

    const visitorKeys = new Set(sourceCode.visitorKeys[node.type]);

    // SAFETY: Visitor keys select ESTree child fields, and every selected value
    // is validated before traversal.
    const entries = Object.entries(node) as [string, unknown][];
    for (const [key, child] of entries) {
      if (!visitorKeys.has(key)) {
        continue;
      }

      if (isArray(child)) {
        for (const childNode of child) {
          if (isNode(childNode) && childNode !== frameworkCall?.callback) {
            walkNode(childNode);
          }
        }
      } else if (isNode(child) && child !== frameworkCall?.callback) {
        walkNode(child);
      }
    }

    visit(node);

    if (
      node.type !== "CallExpression" ||
      node.callee.type === "Super" ||
      node.callee.type === "V8IntrinsicExpression"
    ) {
      return;
    }

    const calledFunction = functionFromExpression(sourceCode, node.callee);
    if (calledFunction !== null) {
      walkFunction(calledFunction);
    }
    if (frameworkCall === null) {
      for (const argument of node.arguments) {
        if (argument.type === "SpreadElement") {
          continue;
        }

        const callback = functionFromExpression(sourceCode, argument);
        if (
          callback?.type === "ArrowFunctionExpression" ||
          callback?.type === "FunctionExpression"
        ) {
          walkFunction(callback);
        }
      }
    }
  };

  if (root.type === "Program") {
    walkNode(root);
  } else {
    walkFunction(root);
  }
}

export function isTestFrameworkControlCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (node.callee.type !== "MemberExpression") {
    return false;
  }

  return isTestFrameworkReference({
    acceptedNames: testControllerNames,
    expression: node.callee.object,
    sourceCode,
  });
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
