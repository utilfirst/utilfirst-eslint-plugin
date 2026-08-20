import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

function unwrapExpression(expression: ESTree.Expression): ESTree.Expression {
  if (
    expression.type === "ChainExpression" ||
    expression.type === "ParenthesizedExpression" ||
    expression.type === "TSAsExpression" ||
    expression.type === "TSNonNullExpression" ||
    expression.type === "TSSatisfiesExpression" ||
    expression.type === "TSTypeAssertion"
  ) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function staticMemberName(expression: ESTree.MemberExpression): string | null {
  if (!expression.computed && expression.property.type === "Identifier") {
    return expression.property.name;
  }
  if (
    expression.computed &&
    expression.property.type === "Literal" &&
    isString(expression.property.value)
  ) {
    return expression.property.value;
  }

  return null;
}

function isRejectionHandler(
  argument: ESTree.Argument | ESTree.SpreadElement | undefined,
): boolean {
  return (
    argument !== undefined &&
    !(argument.type === "Identifier" && argument.name === "undefined") &&
    !(argument.type === "Literal" && argument.value === null)
  );
}

function hasRejectionHandler(expression: ESTree.Expression): boolean {
  const unwrapped = unwrapExpression(expression);
  if (unwrapped.type !== "CallExpression") {
    return false;
  }
  if (
    unwrapped.callee.type !== "Super" &&
    unwrapped.callee.type !== "V8IntrinsicExpression" &&
    "object" in unwrapped.callee &&
    "property" in unwrapped.callee
  ) {
    const memberName = staticMemberName(unwrapped.callee);
    if (memberName === "catch") {
      return isRejectionHandler(unwrapped.arguments[0]);
    }
    if (memberName === "then") {
      return isRejectionHandler(unwrapped.arguments[1]);
    }

    return hasRejectionHandler(unwrapped.callee.object);
  }

  return false;
}

/** Require detached call chains to consume their rejection. */
export const noUnhandledDetachedPromisesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow detached call chains that do not install a rejection handler.",
    },
    messages: {
      unhandledDetachedPromise:
        "This detached call does not handle rejection. Add `.catch(...)` or a second `.then(...)` callback at this boundary.",
    },
  },
  createOnce(context) {
    return {
      UnaryExpression(node) {
        if (
          node.operator === "void" &&
          unwrapExpression(node.argument).type === "CallExpression" &&
          !hasRejectionHandler(node.argument)
        ) {
          context.report({
            node,
            messageId: "unhandledDetachedPromise",
          });
        }
      },
    };
  },
});
