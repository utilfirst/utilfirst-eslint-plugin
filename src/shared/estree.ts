import type { ESTree } from "@oxlint/plugins";

export function staticMemberName(
  expression: ESTree.MemberExpression,
): string | null {
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
