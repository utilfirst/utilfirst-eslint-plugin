import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";

function unwrapParentheses(expression: ESTree.Expression): ESTree.Expression {
  let current = expression;
  while (current.type === "ParenthesizedExpression") {
    current = current.expression;
  }

  return current;
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
