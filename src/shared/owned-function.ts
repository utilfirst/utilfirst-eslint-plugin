import type { ESTree } from "@oxlint/plugins";

export type OwnedFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

export type OwnedCallable =
  | OwnedFunction
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

export function getOwnedFunctionName(node: OwnedCallable): string | null {
  if (
    (node.type === "FunctionDeclaration" ||
      node.type === "TSDeclareFunction") &&
    node.id !== null
  ) {
    return node.id.name;
  }
  if (node.type === "TSMethodSignature") {
    return getStaticPropertyName({
      isComputed: node.computed,
      key: node.key,
    });
  }
  if (
    node.type === "TSCallSignatureDeclaration" ||
    node.type === "TSConstructSignatureDeclaration" ||
    node.type === "TSConstructorType" ||
    node.type === "TSFunctionType"
  ) {
    return getDeclarationOwnerName(node);
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

function getDeclarationOwnerName(node: ESTree.Node): string | null {
  let current: ESTree.Node | null = node.parent;
  while (current !== null && current.type !== "Program") {
    if (current.type === "TSTypeAliasDeclaration") {
      return current.id.name;
    }
    if (current.type === "TSInterfaceDeclaration") {
      return current.id.name;
    }
    if (current.type === "TSPropertySignature") {
      return getStaticPropertyName({
        isComputed: current.computed,
        key: current.key,
      });
    }
    if (current.type === "TSInterfaceBody") {
      return current.parent.type === "TSInterfaceDeclaration"
        ? current.parent.id.name
        : null;
    }
    if (
      current.type !== "TSIntersectionType" &&
      current.type !== "TSParenthesizedType" &&
      current.type !== "TSTypeAnnotation" &&
      current.type !== "TSTypeLiteral" &&
      current.type !== "TSUnionType"
    ) {
      return null;
    }

    current = current.parent;
  }

  return null;
}

function getStaticPropertyName({
  isComputed,
  key,
}: {
  isComputed: boolean;
  key: ESTree.PropertyKey;
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
