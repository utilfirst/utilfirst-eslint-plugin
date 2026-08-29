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

function ownsTypeName(definition: Variable["defs"][number]): boolean {
  // SAFETY: TypeScript ESLint emits `Type` definitions for type-space owners,
  // but the shared Oxlint declaration omits that runtime variant.
  const runtimeDefinition = definition as TypeAliasDefinition;

  return (
    runtimeDefinition.type === "Type" ||
    definition.type === "ClassName" ||
    definition.type === "ImportBinding"
  );
}

function typeDefinitions(
  sourceCode: SourceCode,
  reference: ESTree.TSTypeReference,
): Variable["defs"] {
  if (reference.typeName.type !== "Identifier") {
    return [];
  }

  let scope: Scope | null = sourceCode.getScope(reference);
  while (scope !== null) {
    const definitions = (
      scope.set.get(reference.typeName.name)?.defs ?? []
    ).filter((definition) => ownsTypeName(definition));

    if (definitions.length > 0) {
      return definitions;
    }

    scope = scope.upper;
  }

  return [];
}

export function resolveTypeAlias(
  sourceCode: SourceCode,
  reference: ESTree.TSTypeReference,
): ESTree.TSTypeAliasDeclaration | null {
  if (reference.typeName.type !== "Identifier") {
    return null;
  }

  for (const definition of typeDefinitions(sourceCode, reference)) {
    const alias = typeAliasDeclarationOf(definition);
    if (alias !== null) {
      return alias;
    }
  }

  return null;
}

export function hasTypeDefinition(
  sourceCode: SourceCode,
  reference: ESTree.TSTypeReference,
): boolean {
  return typeDefinitions(sourceCode, reference).length > 0;
}

export function resolveTypeInterfaces(
  sourceCode: SourceCode,
  reference: ESTree.TSTypeReference,
): readonly ESTree.TSInterfaceDeclaration[] {
  if (reference.typeName.type !== "Identifier") {
    return [];
  }

  return typeDefinitions(sourceCode, reference).flatMap((definition) => {
    // SAFETY: TypeScript ESLint emits `Type` definitions for interfaces, but
    // the shared Oxlint declaration omits that runtime variant.
    const runtimeDefinition = definition as TypeAliasDefinition;

    return runtimeDefinition.type === "Type" &&
      runtimeDefinition.node.type === "TSInterfaceDeclaration"
      ? [runtimeDefinition.node]
      : [];
  });
}

type ResolvedTypeMatchOptions = {
  readonly isMatch: (type: ESTree.TSType) => boolean;
  readonly shadowedTypeNames?: ReadonlySet<string>;
  readonly sourceCode: SourceCode;
  readonly transparentTypeNames?: ReadonlySet<string>;
  readonly type: ESTree.TSType;
};

type ResolvedType = {
  readonly substitutions: TypeSubstitutions;
  readonly type: ESTree.TSType;
};

type TypeSubstitutions = ReadonlyMap<string, ResolvedType>;

type ResolvedTypeTraversalOptions = {
  readonly isMatch: (type: ESTree.TSType) => boolean;
  readonly resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>;
  readonly shadowedTypeNames: ReadonlySet<string> | undefined;
  readonly sourceCode: SourceCode;
  readonly substitutions: TypeSubstitutions;
  readonly transparentTypeNames: ReadonlySet<string> | undefined;
  readonly type: ESTree.TSType;
};

function aliasSubstitutions({
  alias,
  base,
  reference,
}: {
  alias: ESTree.TSTypeAliasDeclaration;
  base: TypeSubstitutions;
  reference: ESTree.TSTypeReference;
}): TypeSubstitutions | null {
  const parameters = alias.typeParameters?.params ?? [];
  const arguments_ = reference.typeArguments?.params ?? [];
  const substitutions = new Map(base);
  for (const [index, parameter] of parameters.entries()) {
    const argument = arguments_[index] ?? parameter.default;
    if (argument === null) {
      return null;
    }

    substitutions.set(parameter.name.name, {
      substitutions: new Map(substitutions),
      type: argument,
    });
  }

  return substitutions;
}

function resolvedTypeIncludes({
  isMatch,
  resolvingAliases,
  shadowedTypeNames,
  sourceCode,
  substitutions,
  transparentTypeNames,
  type,
}: ResolvedTypeTraversalOptions): boolean {
  if (isMatch(type)) {
    return true;
  }
  if (type.type === "TSParenthesizedType") {
    return resolvedTypeIncludes({
      isMatch,
      resolvingAliases,
      shadowedTypeNames,
      sourceCode,
      substitutions,
      transparentTypeNames,
      type: type.typeAnnotation,
    });
  }
  if (type.type === "TSUnionType") {
    return type.types.some((member) =>
      resolvedTypeIncludes({
        isMatch,
        resolvingAliases,
        shadowedTypeNames,
        sourceCode,
        substitutions,
        transparentTypeNames,
        type: member,
      }),
    );
  }
  if (type.type !== "TSTypeReference" || type.typeName.type !== "Identifier") {
    return false;
  }

  const name = type.typeName.name;
  const substitution = substitutions.get(name);
  if (substitution !== undefined) {
    return resolvedTypeIncludes({
      isMatch,
      resolvingAliases,
      shadowedTypeNames,
      sourceCode,
      substitutions: substitution.substitutions,
      transparentTypeNames,
      type: substitution.type,
    });
  }
  if (shadowedTypeNames?.has(name) === true) {
    return false;
  }

  const alias = resolveTypeAlias(sourceCode, type);
  if (alias !== null) {
    if (resolvingAliases.has(alias)) {
      return false;
    }

    const nextSubstitutions = aliasSubstitutions({
      alias,
      base: substitutions,
      reference: type,
    });

    if (nextSubstitutions !== null) {
      return resolvedTypeIncludes({
        isMatch,
        resolvingAliases: new Set([...resolvingAliases, alias]),
        shadowedTypeNames,
        sourceCode,
        substitutions: nextSubstitutions,
        transparentTypeNames,
        type: alias.typeAnnotation,
      });
    }

    return false;
  }
  if (transparentTypeNames?.has(name) !== true) {
    return false;
  }
  if (hasTypeDefinition(sourceCode, type)) {
    return false;
  }

  const wrappedType = type.typeArguments?.params[0];

  return (
    wrappedType !== undefined &&
    resolvedTypeIncludes({
      isMatch,
      resolvingAliases,
      shadowedTypeNames,
      sourceCode,
      substitutions,
      transparentTypeNames,
      type: wrappedType,
    })
  );
}

/** Match a type after resolving local aliases and their generic arguments. */
export function resolvedTypeIncludesMatch({
  isMatch,
  shadowedTypeNames,
  sourceCode,
  transparentTypeNames,
  type,
}: ResolvedTypeMatchOptions): boolean {
  return resolvedTypeIncludes({
    isMatch,
    resolvingAliases: new Set(),
    shadowedTypeNames,
    sourceCode,
    substitutions: new Map(),
    transparentTypeNames,
    type,
  });
}
