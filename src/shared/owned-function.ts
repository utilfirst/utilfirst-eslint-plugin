import type { ESTree } from "@oxlint/plugins";

export type OwnedFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

export function getOwnedFunctionName(node: OwnedFunction): string | null {
  if (node.type === "FunctionDeclaration") {
    return node.id?.name ?? null;
  }

  const { parent } = node;
  if (
    parent.type === "VariableDeclarator" &&
    parent.init === node &&
    parent.id.type === "Identifier"
  ) {
    return parent.id.name;
  }
  if (
    parent.type === "Property" &&
    parent.value === node &&
    parent.parent.type === "ObjectExpression"
  ) {
    return getStaticPropertyName({
      isComputed: parent.computed,
      key: parent.key,
    });
  }
  if (
    (parent.type === "MethodDefinition" ||
      parent.type === "TSAbstractMethodDefinition") &&
    parent.value === node
  ) {
    return getStaticPropertyName({
      isComputed: parent.computed,
      key: parent.key,
    });
  }
  if (
    (parent.type === "PropertyDefinition" ||
      parent.type === "TSAbstractPropertyDefinition") &&
    parent.value === node
  ) {
    return getStaticPropertyName({
      isComputed: parent.computed,
      key: parent.key,
    });
  }

  return null;
}

function getStaticPropertyName({
  isComputed,
  key,
}: {
  isComputed: boolean;
  key: ESTree.MethodDefinition["key"];
}): string | null {
  if (key.type === "PrivateIdentifier") {
    return `#${key.name}`;
  }
  if (!isComputed && key.type === "Identifier") {
    return key.name;
  }
  if (key.type === "Literal") {
    return parseStaticPropertyValue(key.value);
  }

  return null;
}

function parseStaticPropertyValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
}
