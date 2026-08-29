import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { staticMemberName } from "../shared/estree.ts";
import { nodeAssertCall } from "../shared/node-assert.ts";
import { resolveVariable } from "../shared/scope.ts";
import {
  hasExpectationModifier,
  isExpectationMatcher,
} from "../shared/test-framework.ts";

const equalityMatchers = new Set(["toBe", "toEqual", "toStrictEqual"]);

const nodeAssertEqualityMethods = new Set([
  "deepEqual",
  "deepStrictEqual",
  "equal",
  "strictEqual",
]);

const importedConstantName = /^[A-Z][A-Z0-9_]*$/u;

function expectationSubject(
  node: ESTree.CallExpression,
): ESTree.Expression | null {
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

  return subject === undefined || subject.type === "SpreadElement"
    ? null
    : subject;
}

function importedConstantRoot(
  expression: ESTree.Expression,
): ESTree.IdentifierReference | null {
  let currentExpression = expression;
  while (currentExpression.type === "MemberExpression") {
    if (staticMemberName(currentExpression) === null) {
      return null;
    }

    currentExpression = currentExpression.object;
  }

  return currentExpression.type === "Identifier" ? currentExpression : null;
}

function nodeAssertSubject(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): ESTree.Expression | null {
  const assertion = nodeAssertCall(sourceCode, node);
  if (
    assertion === null ||
    !nodeAssertEqualityMethods.has(assertion.methodName)
  ) {
    return null;
  }

  const [subject] = assertion.arguments;

  return subject === undefined || subject.type === "SpreadElement"
    ? null
    : subject;
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

function isImportedConstantExpression(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): boolean {
  const constantRoot = importedConstantRoot(expression);
  return constantRoot !== null && isImportedConstant(sourceCode, constantRoot);
}

function isImportedConstantRestatement({
  left,
  right,
  sourceCode,
}: {
  left: ESTree.Expression;
  right: ESTree.Expression;
  sourceCode: SourceCode;
}): boolean {
  return (
    (isImportedConstantExpression(sourceCode, left) && isStaticValue(right)) ||
    (isStaticValue(left) && isImportedConstantExpression(sourceCode, right))
  );
}

/** Require tests to exercise behavior instead of restating imported constants. */
export const noImportedConstantRestatementRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow equality assertions that restate an imported constant through a static literal.",
    },
    messages: {
      importedConstantRestatement:
        "Exercise behavior that consumes this constant. Use a reasoned suppression only when the exact literal is an external contract.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const isExpectEquality =
          node.callee.type === "MemberExpression" &&
          isExpectationMatcher(context.sourceCode, node) &&
          equalityMatchers.has(staticMemberName(node.callee) ?? "") &&
          !hasExpectationModifier(node.callee.object, "not");

        const subject = isExpectEquality
          ? expectationSubject(node)
          : nodeAssertSubject(context.sourceCode, node);

        const expected = node.arguments[isExpectEquality ? 0 : 1];
        if (
          subject === null ||
          expected === undefined ||
          expected.type === "SpreadElement" ||
          !isImportedConstantRestatement({
            left: subject,
            right: expected,
            sourceCode: context.sourceCode,
          })
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
