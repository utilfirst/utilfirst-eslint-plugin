import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";
import {
  resolveTypeAlias,
  resolveTypeInterfaces,
} from "../shared/type-alias.ts";

type GuardType = "boolean" | "non-boolean" | "number" | "string" | "unknown";

const BOOLEAN_BINARY_OPERATORS = new Set([
  "!=",
  "!==",
  "<",
  "<=",
  "==",
  "===",
  ">",
  ">=",
  "in",
  "instanceof",
]);

function unwrapExpression(expression: ESTree.Expression): ESTree.Expression {
  if (
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

function propertyNameOf(key: ESTree.PropertyKey): string | null {
  if (key.type === "Identifier") {
    return key.name;
  }
  if (key.type === "Literal" && typeof key.value === "string") {
    return key.value;
  }

  return null;
}

function propertyTypeInMembers(
  members: readonly ESTree.TSSignature[],
  propertyName: string,
): ESTree.TSType | null {
  for (const member of members) {
    if (
      member.type === "TSPropertySignature" &&
      !member.computed &&
      propertyNameOf(member.key) === propertyName
    ) {
      return member.typeAnnotation?.typeAnnotation ?? null;
    }
  }

  return null;
}

type PropertyTypeOptions = {
  readonly propertyName: string;
  readonly resolvingAliases?: ReadonlySet<ESTree.TSTypeAliasDeclaration>;
  readonly sourceCode: SourceCode;
  readonly type: ESTree.TSType;
};

function propertyTypeOf({
  propertyName,
  resolvingAliases = new Set(),
  sourceCode,
  type,
}: PropertyTypeOptions): ESTree.TSType | null {
  if (type.type === "TSParenthesizedType") {
    return propertyTypeOf({
      propertyName,
      resolvingAliases,
      sourceCode,
      type: type.typeAnnotation,
    });
  }
  if (type.type === "TSTypeLiteral") {
    return propertyTypeInMembers(type.members, propertyName);
  }
  if (type.type !== "TSTypeReference") {
    return null;
  }

  const alias = resolveTypeAlias(sourceCode, type);
  if (alias !== null && !resolvingAliases.has(alias)) {
    return propertyTypeOf({
      propertyName,
      resolvingAliases: new Set([...resolvingAliases, alias]),
      sourceCode,
      type: alias.typeAnnotation,
    });
  }

  for (const declaration of resolveTypeInterfaces(sourceCode, type)) {
    const propertyType = propertyTypeInMembers(
      declaration.body.body,
      propertyName,
    );

    if (propertyType !== null) {
      return propertyType;
    }
  }

  return null;
}

function destructuredTypeOf(
  sourceCode: SourceCode,
  identifier: ESTree.BindingIdentifier,
): ESTree.TSType | null {
  let pattern: ESTree.Node = identifier;
  let propertyName: string | null = null;
  while (
    pattern.parent.type === "AssignmentPattern" ||
    pattern.parent.type === "Property"
  ) {
    pattern = pattern.parent;
    if (pattern.type === "Property") {
      propertyName = propertyNameOf(pattern.key);
    }
  }

  if (
    propertyName === null ||
    pattern.parent.type !== "ObjectPattern" ||
    pattern.parent.typeAnnotation === null ||
    pattern.parent.typeAnnotation === undefined
  ) {
    return null;
  }

  return propertyTypeOf({
    propertyName,
    sourceCode,
    type: pattern.parent.typeAnnotation.typeAnnotation,
  });
}

function declaredTypeOf(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): ESTree.TSType | null {
  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null) {
    return null;
  }

  for (const definition of variable.defs) {
    if (definition.name.typeAnnotation != null) {
      return definition.name.typeAnnotation.typeAnnotation;
    }

    const destructuredType = destructuredTypeOf(sourceCode, definition.name);
    if (destructuredType !== null) {
      return destructuredType;
    }
  }

  return null;
}

function declaredTypeOfExpression(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): ESTree.TSType | null {
  const unwrapped = unwrapExpression(expression);
  if (unwrapped.type === "Identifier") {
    return declaredTypeOf(sourceCode, unwrapped);
  }
  if (
    unwrapped.type !== "MemberExpression" ||
    unwrapped.computed ||
    unwrapped.property.type !== "Identifier"
  ) {
    return null;
  }

  const objectType = declaredTypeOfExpression(sourceCode, unwrapped.object);

  return objectType === null
    ? null
    : propertyTypeOf({
        propertyName: unwrapped.property.name,
        sourceCode,
        type: objectType,
      });
}

type GuardTypeOptions = {
  readonly resolvingAliases?: ReadonlySet<ESTree.TSTypeAliasDeclaration>;
  readonly sourceCode: SourceCode;
  readonly type: ESTree.TSType;
};

function guardTypeOfType({
  resolvingAliases = new Set(),
  sourceCode,
  type,
}: GuardTypeOptions): GuardType {
  if (type.type === "TSParenthesizedType") {
    return guardTypeOfType({
      resolvingAliases,
      sourceCode,
      type: type.typeAnnotation,
    });
  }
  if (type.type === "TSBooleanKeyword") {
    return "boolean";
  }
  if (type.type === "TSNumberKeyword") {
    return "number";
  }
  if (type.type === "TSStringKeyword") {
    return "string";
  }

  if (type.type === "TSLiteralType" && "value" in type.literal) {
    if (typeof type.literal.value === "boolean") {
      return "boolean";
    }
    if (typeof type.literal.value === "number") {
      return "number";
    }
    if (typeof type.literal.value === "string") {
      return "string";
    }
  }
  if (type.type === "TSUnionType") {
    const memberTypes = new Set(
      type.types
        .filter(
          (member) =>
            member.type !== "TSNullKeyword" &&
            member.type !== "TSUndefinedKeyword" &&
            member.type !== "TSVoidKeyword",
        )
        .map((member) =>
          guardTypeOfType({ resolvingAliases, sourceCode, type: member }),
        ),
    );

    if (memberTypes.size === 1) {
      return memberTypes.values().next().value ?? "unknown";
    }
    if (memberTypes.has("number") || memberTypes.has("string")) {
      return "non-boolean";
    }

    return "unknown";
  }
  if (type.type === "TSIntersectionType") {
    const primitiveTypes = new Set(
      type.types
        .map((member) =>
          guardTypeOfType({ resolvingAliases, sourceCode, type: member }),
        )
        .filter((member) => member !== "unknown"),
    );

    return primitiveTypes.size === 1
      ? (primitiveTypes.values().next().value ?? "unknown")
      : "unknown";
  }

  if (type.type === "TSTypeReference") {
    const alias = resolveTypeAlias(sourceCode, type);
    if (alias !== null && !resolvingAliases.has(alias)) {
      return guardTypeOfType({
        resolvingAliases: new Set([...resolvingAliases, alias]),
        sourceCode,
        type: alias.typeAnnotation,
      });
    }
  }

  return "unknown";
}

function guardTypeOfExpression(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): GuardType {
  const unwrapped = unwrapExpression(expression);
  if (unwrapped.type === "Literal") {
    if (typeof unwrapped.value === "boolean") {
      return "boolean";
    }
    if (typeof unwrapped.value === "number") {
      return "number";
    }
    if (typeof unwrapped.value === "string") {
      return "string";
    }
  }
  if (unwrapped.type === "UnaryExpression" && unwrapped.operator === "!") {
    return "boolean";
  }
  if (
    unwrapped.type === "BinaryExpression" &&
    BOOLEAN_BINARY_OPERATORS.has(unwrapped.operator)
  ) {
    return "boolean";
  }
  if (unwrapped.type === "LogicalExpression") {
    const leftType = guardTypeOfExpression(sourceCode, unwrapped.left);
    const rightType = guardTypeOfExpression(sourceCode, unwrapped.right);
    return leftType === rightType ? leftType : "unknown";
  }
  if (unwrapped.type === "ConditionalExpression") {
    const consequentType = guardTypeOfExpression(
      sourceCode,
      unwrapped.consequent,
    );

    const alternateType = guardTypeOfExpression(
      sourceCode,
      unwrapped.alternate,
    );

    return consequentType === alternateType ? consequentType : "unknown";
  }

  const declaredType = declaredTypeOfExpression(sourceCode, unwrapped);

  return declaredType === null
    ? "unknown"
    : guardTypeOfType({ sourceCode, type: declaredType });
}

function isNull(expression: ESTree.Expression): boolean {
  const unwrapped = unwrapExpression(expression);
  return unwrapped.type === "Literal" && unwrapped.value === null;
}

function needsConditionParentheses(expression: ESTree.Expression): boolean {
  const unwrapped = unwrapExpression(expression);

  return (
    unwrapped.type === "AssignmentExpression" ||
    unwrapped.type === "ConditionalExpression" ||
    unwrapped.type === "SequenceExpression" ||
    (unwrapped.type === "LogicalExpression" && unwrapped.operator !== "&&")
  );
}

function conditionTextOf(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): string {
  const text = sourceCode.getText(expression);
  return needsConditionParentheses(expression) ? `(${text})` : text;
}

function negatedConditionTextOf(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): string {
  const unwrapped = unwrapExpression(expression);

  const text = sourceCode.getText(expression);
  if (
    unwrapped.type === "CallExpression" ||
    unwrapped.type === "Identifier" ||
    unwrapped.type === "Literal" ||
    unwrapped.type === "MemberExpression" ||
    unwrapped.type === "UnaryExpression"
  ) {
    return `!${text}`;
  }

  return `!(${text})`;
}

function renderedTextOf(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): string {
  const unwrapped = unwrapExpression(expression);

  const text = sourceCode.getText(expression);

  return unwrapped.type === "AssignmentExpression" ||
    unwrapped.type === "ConditionalExpression" ||
    unwrapped.type === "SequenceExpression" ||
    (unwrapped.type === "LogicalExpression" && unwrapped.operator !== "&&")
    ? `(${text})`
    : text;
}

/** Require boolean guards and canonical `&&` JSX conditionals. */
export const preferJsxBooleanAndRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require boolean JSX guards and replace boolean null-branch conditionals with logical AND.",
    },
    fixable: "code",
    messages: {
      explicitPredicate:
        "Use an explicit {{type}} predicate before conditionally rendering JSX.",
      preferAnd:
        "Replace this boolean null-branch conditional with logical AND.",
    },
  },
  createOnce(context) {
    const checkLogicalExpression = (expression: ESTree.LogicalExpression) => {
      if (
        expression.parent.type !== "JSXExpressionContainer" ||
        expression.operator !== "&&"
      ) {
        return;
      }

      const guardType = guardTypeOfExpression(
        context.sourceCode,
        expression.left,
      );

      if (
        guardType === "non-boolean" ||
        guardType === "number" ||
        guardType === "string"
      ) {
        context.report({
          node: expression.left,
          messageId: "explicitPredicate",
          data: { type: guardType },
        });
      }
    };

    const checkConditionalExpression = (
      expression: ESTree.ConditionalExpression,
    ) => {
      if (expression.parent.type !== "JSXExpressionContainer") {
        return;
      }

      const isConsequentNull = isNull(expression.consequent);
      const isAlternateNull = isNull(expression.alternate);
      if (isConsequentNull === isAlternateNull) {
        return;
      }
      if (
        guardTypeOfExpression(context.sourceCode, expression.test) !== "boolean"
      ) {
        return;
      }

      const unwrappedTest = unwrapExpression(expression.test);
      if (
        isConsequentNull &&
        unwrappedTest.type === "UnaryExpression" &&
        unwrappedTest.operator === "!" &&
        guardTypeOfExpression(context.sourceCode, unwrappedTest.argument) !==
          "boolean"
      ) {
        return;
      }

      let condition = expression.test;
      let isNegated = isConsequentNull;
      if (
        isConsequentNull &&
        unwrappedTest.type === "UnaryExpression" &&
        unwrappedTest.operator === "!"
      ) {
        condition = unwrappedTest.argument;
        isNegated = false;
      }

      const rendered = isConsequentNull
        ? expression.alternate
        : expression.consequent;

      const conditionText = isNegated
        ? negatedConditionTextOf(context.sourceCode, condition)
        : conditionTextOf(context.sourceCode, condition);

      const replacement = `${conditionText} && ${renderedTextOf(context.sourceCode, rendered)}`;
      context.report({
        node: expression,
        messageId: "preferAnd",
        fix(fixer) {
          return fixer.replaceText(expression, replacement);
        },
      });
    };

    return {
      ConditionalExpression: checkConditionalExpression,
      LogicalExpression: checkLogicalExpression,
    };
  },
});
