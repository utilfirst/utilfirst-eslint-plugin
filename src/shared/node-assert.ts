import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { staticMemberName } from "./estree.ts";
import { resolveVariable } from "./scope.ts";

const nodeAssertSources = new Set(["node:assert", "node:assert/strict"]);

export type NodeAssertCall = {
  arguments: ESTree.CallExpression["arguments"];
  methodName: string;
};

function importedName(node: ESTree.Node): string | null {
  if (node.type !== "ImportSpecifier") {
    return null;
  }

  return node.imported.type === "Identifier"
    ? node.imported.name
    : node.imported.value;
}

function nodeAssertDefinitions(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): Variable["defs"] {
  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null) {
    return [];
  }

  return variable.defs.filter(
    (definition) =>
      definition.type === "ImportBinding" &&
      definition.parent?.type === "ImportDeclaration" &&
      nodeAssertSources.has(definition.parent.source.value),
  );
}

function isNodeAssertModule(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean {
  return nodeAssertDefinitions(sourceCode, identifier).some(
    (definition) =>
      definition.node.type === "ImportDefaultSpecifier" ||
      definition.node.type === "ImportNamespaceSpecifier",
  );
}

function isNodeAssertObject(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean {
  return (
    isNodeAssertModule(sourceCode, identifier) ||
    nodeAssertDefinitions(sourceCode, identifier).some(
      (definition) => importedName(definition.node) === "strict",
    )
  );
}

function isNodeAssertMemberObject(
  sourceCode: SourceCode,
  expression: ESTree.Expression | ESTree.Super,
): boolean {
  if (expression.type === "Identifier") {
    return isNodeAssertObject(sourceCode, expression);
  }

  return (
    expression.type === "MemberExpression" &&
    staticMemberName(expression) === "strict" &&
    expression.object.type === "Identifier" &&
    isNodeAssertModule(sourceCode, expression.object)
  );
}

function importedAssertFunctionName(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): string | null {
  for (const definition of nodeAssertDefinitions(sourceCode, identifier)) {
    if (definition.node.type === "ImportDefaultSpecifier") {
      return "ok";
    }

    const name = importedName(definition.node);
    if (name !== null) {
      return name === "strict" ? "ok" : name;
    }
  }

  return null;
}

/** Resolve a Node assert call through supported import and strict-object forms. */
export function nodeAssertCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): NodeAssertCall | null {
  if (node.callee.type === "Identifier") {
    const methodName = importedAssertFunctionName(sourceCode, node.callee);

    return methodName === null
      ? null
      : { arguments: node.arguments, methodName };
  }
  if (
    node.callee.type !== "MemberExpression" ||
    !isNodeAssertMemberObject(sourceCode, node.callee.object)
  ) {
    return null;
  }

  const methodName = staticMemberName(node.callee);
  if (
    methodName === "strict" &&
    node.callee.object.type === "Identifier" &&
    isNodeAssertModule(sourceCode, node.callee.object)
  ) {
    return { arguments: node.arguments, methodName: "ok" };
  }

  return methodName === null ? null : { arguments: node.arguments, methodName };
}
