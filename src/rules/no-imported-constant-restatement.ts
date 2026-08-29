import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { resolveVariable } from "../shared/scope.ts";
import {
  isExpectationMatcher,
  staticMemberName,
} from "../shared/test-framework.ts";

const equalityMatchers = new Set(["toBe", "toEqual", "toStrictEqual"]);
const importedConstantName = /^[A-Z][A-Z0-9_]*$/u;

function expectationSubject(
  node: ESTree.CallExpression,
): ESTree.IdentifierReference | null {
  if (node.callee.type !== "MemberExpression") {
    return null;
  }

  let expression: ESTree.Expression = node.callee.object;
  while (expression.type === "MemberExpression") {
    expression = expression.object;
  }

  if (expression.type !== "CallExpression") {
    return null;
  }

  const [subject] = expression.arguments;
  return subject?.type === "Identifier" ? subject : null;
}

function isStaticValue(expression: ESTree.Expression): boolean {
  if (expression.type === "Literal") {
    return true;
  }
  if (expression.type === "TemplateLiteral") {
    return expression.expressions.length === 0;
  }
  if (expression.type === "UnaryExpression") {
    return isStaticValue(expression.argument);
  }
  if (expression.type === "ArrayExpression") {
    return expression.elements.every(
      (element) =>
        element !== null &&
        element.type !== "SpreadElement" &&
        isStaticValue(element),
    );
  }
  if (expression.type === "ObjectExpression") {
    return expression.properties.every((property) => {
      if (
        property.type !== "Property" ||
        property.kind !== "init" ||
        property.method
      ) {
        return false;
      }
      if (
        property.computed &&
        (property.key.type === "PrivateIdentifier" ||
          !isStaticValue(property.key))
      ) {
        return false;
      }

      return isStaticValue(property.value);
    });
  }

  return false;
}

function isImportedConstant(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean {
  if (!importedConstantName.test(identifier.name)) {
    return false;
  }

  const variable = resolveVariable(sourceCode, identifier);

  return (
    variable !== null &&
    variable.defs.some((definition) => definition.type === "ImportBinding")
  );
}

/** Require tests to exercise behavior instead of restating imported constants. */
export const noImportedConstantRestatementRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow assertions that compare an imported constant directly with a static literal.",
    },
    messages: {
      importedConstantRestatement:
        "Exercise behavior that consumes this constant. Use a reasoned suppression only when the exact literal is an external contract.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          !isExpectationMatcher(context.sourceCode, node) ||
          !equalityMatchers.has(staticMemberName(node.callee) ?? "")
        ) {
          return;
        }

        const subject = expectationSubject(node);

        const [expected] = node.arguments;
        if (
          subject === null ||
          expected === undefined ||
          expected.type === "SpreadElement" ||
          !isImportedConstant(context.sourceCode, subject) ||
          !isStaticValue(expected)
        ) {
          return;
        }

        context.report({
          node,
          messageId: "importedConstantRestatement",
        });
      },
    };
  },
});
