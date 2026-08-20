import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

function unwrapParentheses(expression: ESTree.Expression): ESTree.Expression {
  let current = expression;
  while (current.type === "ParenthesizedExpression") {
    current = current.expression;
  }

  return current;
}

function resolveVariable(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): Variable | null {
  let scope: Scope | null = sourceCode.getScope(identifier);
  while (scope !== null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) {
      return variable;
    }

    scope = scope.upper;
  }

  return null;
}

function isUndefinedExpression(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): boolean {
  const unwrapped = unwrapParentheses(expression);

  const undefinedVariable =
    unwrapped.type === "Identifier" && unwrapped.name === "undefined"
      ? resolveVariable(sourceCode, unwrapped)
      : undefined;

  return (
    (unwrapped.type === "Identifier" &&
      unwrapped.name === "undefined" &&
      (undefinedVariable === null || undefinedVariable?.defs.length === 0)) ||
    (unwrapped.type === "UnaryExpression" && unwrapped.operator === "void")
  );
}

function hasConditionalUndefinedValue(
  sourceCode: SourceCode,
  value: ESTree.Expression,
): boolean {
  const unwrapped = unwrapParentheses(value);
  if (unwrapped.type !== "ConditionalExpression") {
    return false;
  }

  return [unwrapped.consequent, unwrapped.alternate].some(
    (branch) =>
      isUndefinedExpression(sourceCode, branch) ||
      hasConditionalUndefinedValue(sourceCode, branch),
  );
}

function isObjectExpressionProperty(
  node: ESTree.Node,
): node is ESTree.ObjectProperty & { parent: ESTree.ObjectExpression } {
  return node.type === "Property" && node.parent.type === "ObjectExpression";
}

/** Disallow conditional undefined values that retain an optional property. */
export const noConditionalUndefinedPropertiesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow object properties whose conditional value is undefined.",
    },
    messages: {
      conditionalUndefined:
        "This conditional keeps the property present with an undefined value. Build a typed object and add the property only when present.",
    },
  },
  createOnce(context) {
    return {
      Property(node) {
        if (
          isObjectExpressionProperty(node) &&
          node.kind === "init" &&
          !node.method &&
          hasConditionalUndefinedValue(context.sourceCode, node.value)
        ) {
          context.report({ node, messageId: "conditionalUndefined" });
        }
      },
    };
  },
});
