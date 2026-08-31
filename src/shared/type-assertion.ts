import type { ESTree } from "@oxlint/plugins";

export type TypeAssertionExpression =
  ESTree.TSAsExpression | ESTree.TSTypeAssertion;

export function isTypeAssertionExpression(
  node: ESTree.Node,
): node is TypeAssertionExpression {
  return node.type === "TSAsExpression" || node.type === "TSTypeAssertion";
}

export function unwrapTypeAssertionBoundary(
  expression: ESTree.Expression,
): ESTree.Expression {
  let current = expression;
  while (
    current.type === "ParenthesizedExpression" ||
    current.type === "TSInstantiationExpression" ||
    current.type === "TSNonNullExpression" ||
    current.type === "TSSatisfiesExpression"
  ) {
    current = current.expression;
  }

  return current;
}

function isTransparentAssertionParent(
  parent: ESTree.Node,
  expression: ESTree.Expression,
): parent is
  | ESTree.ParenthesizedExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression {
  return (
    (parent.type === "ParenthesizedExpression" ||
      parent.type === "TSInstantiationExpression" ||
      parent.type === "TSNonNullExpression" ||
      parent.type === "TSSatisfiesExpression") &&
    parent.expression === expression
  );
}

export function isOutermostTypeAssertion(
  node: TypeAssertionExpression,
): boolean {
  let current: ESTree.Expression = node;
  let parent = node.parent;
  while (isTransparentAssertionParent(parent, current)) {
    current = parent;
    parent = parent.parent;
  }

  return !isTypeAssertionExpression(parent) || parent.expression !== current;
}
