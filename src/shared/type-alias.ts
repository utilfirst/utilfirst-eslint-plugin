import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins";

type TypeAliasDefinition = {
  readonly node: ESTree.Node;
  readonly type: string;
};

function typeAliasDeclarationOf(
  definition: Variable["defs"][number],
): ESTree.TSTypeAliasDeclaration | null {
  // SAFETY: TypeScript ESLint emits `Type` definitions for aliases, but the
  // shared Oxlint declaration omits that runtime variant.
  const runtimeDefinition = definition as TypeAliasDefinition;

  return runtimeDefinition.type === "Type" &&
    runtimeDefinition.node.type === "TSTypeAliasDeclaration"
    ? runtimeDefinition.node
    : null;
}

export function resolveTypeAlias(
  sourceCode: SourceCode,
  reference: ESTree.TSTypeReference,
): ESTree.TSTypeAliasDeclaration | null {
  if (reference.typeName.type !== "Identifier") {
    return null;
  }

  let scope: Scope | null = sourceCode.getScope(reference);
  while (scope !== null) {
    const variable = scope.set.get(reference.typeName.name);
    for (const definition of variable?.defs ?? []) {
      const alias = typeAliasDeclarationOf(definition);
      if (alias !== null) {
        return alias;
      }
    }

    scope = scope.upper;
  }

  return null;
}
