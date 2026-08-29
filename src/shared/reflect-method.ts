import type { ESTree, SourceCode } from "@oxlint/plugins";

import { resolveVariable } from "./scope.ts";

function isGlobalReflect(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): boolean {
  if (expression.type === "Identifier" && expression.name === "Reflect") {
    const variable = resolveVariable(sourceCode, expression);
    return variable === null || variable.defs.length === 0;
  }
  if (
    expression.type !== "MemberExpression" ||
    staticMemberName(expression) !== "Reflect" ||
    expression.object.type !== "Identifier" ||
    expression.object.name !== "globalThis"
  ) {
    return false;
  }

  const variable = resolveVariable(sourceCode, expression.object);
  return variable === null || variable.defs.length === 0;
}

function staticMemberName(expression: ESTree.MemberExpression): string | null {
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

/** Reports whether a call target names one method on the global Reflect object. */
export function isGlobalReflectMethodCall({
  callee,
  methodName,
  sourceCode,
}: {
  callee: ESTree.Expression;
  methodName: string;
  sourceCode: SourceCode;
}): boolean {
  if (
    !("property" in callee) ||
    !("object" in callee) ||
    !("computed" in callee)
  ) {
    return false;
  }
  if (!isGlobalReflect(sourceCode, callee.object)) {
    return false;
  }

  return staticMemberName(callee) === methodName;
}
