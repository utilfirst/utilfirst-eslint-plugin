import type { ESTree, SourceCode } from "@oxlint/plugins";
import {
  hasTypeDefinition,
  resolveTypeAlias,
  resolveTypeInterfaces,
} from "./type-alias.ts";

const BUILT_INS = new Set([
  "Map",
  "ReadonlyMap",
  "Record",
  "Readonly",
  "Partial",
  "Required",
  "Pick",
  "Omit",
  "PropertyKey",
  "NonNullable",
  "WeakMap",
]);

const TRANSPARENT_WRAPPERS = new Set([
  "Readonly",
  "Partial",
  "Required",
  "NonNullable",
]);

type TypeAliasEnvironment = ReadonlyMap<string, ESTree.TSType>;

type ResolvedType = {
  readonly type: ESTree.TSType;
  readonly substitutions: TypeAliasEnvironment;
};

export type UnsafeDictionary = {
  readonly kind: "unsafe-dictionary";
  readonly unsafeValue: "any" | "empty-object" | "object" | "union" | "unknown";
};

export type WideningTargetKind =
  | "anonymous object"
  | "generic container"
  | "object"
  | "open dictionary"
  | "unknown";

export type WideningTarget = {
  readonly kind: WideningTargetKind;
};

export type TypeEnvironment = {
  readonly aliases: ReadonlyMap<string, ESTree.TSTypeAliasDeclaration>;
  readonly interfaces: ReadonlyMap<
    string,
    readonly ESTree.TSInterfaceDeclaration[]
  >;
  readonly shadowedBuiltIns: ReadonlySet<string>;
  readonly sourceCode: SourceCode;
};

function declaredStatement(statement: ESTree.Statement): ESTree.Node | null {
  return statement.type === "ExportNamedDeclaration" ||
    statement.type === "ExportDefaultDeclaration"
    ? (statement.declaration ?? null)
    : statement;
}

export function createTypeEnvironment(
  program: ESTree.Program,
  sourceCode: SourceCode,
): TypeEnvironment {
  const aliases = new Map<string, ESTree.TSTypeAliasDeclaration>();
  const interfaces = new Map<string, ESTree.TSInterfaceDeclaration[]>();
  const shadowedBuiltIns = new Set<string>();
  for (const statement of program.body) {
    const declaration = declaredStatement(statement);
    if (declaration?.type === "ImportDeclaration") {
      for (const specifier of declaration.specifiers) {
        if (BUILT_INS.has(specifier.local.name)) {
          shadowedBuiltIns.add(specifier.local.name);
        }
      }

      continue;
    }
    if (declaration?.type === "TSTypeAliasDeclaration") {
      const existing = aliases.get(declaration.id.name);
      if (existing === undefined) {
        aliases.set(declaration.id.name, declaration);
      } else {
        shadowedBuiltIns.add(declaration.id.name);
      }
      if (BUILT_INS.has(declaration.id.name)) {
        shadowedBuiltIns.add(declaration.id.name);
      }

      continue;
    }
    if (declaration?.type === "TSInterfaceDeclaration") {
      const declarations = interfaces.get(declaration.id.name) ?? [];
      declarations.push(declaration);
      interfaces.set(declaration.id.name, declarations);
      if (BUILT_INS.has(declaration.id.name)) {
        shadowedBuiltIns.add(declaration.id.name);
      }

      continue;
    }
    if (declaration?.type === "TSEnumDeclaration") {
      if (BUILT_INS.has(declaration.id.name)) {
        shadowedBuiltIns.add(declaration.id.name);
      }

      continue;
    }

    if (
      (declaration?.type === "ClassDeclaration" ||
        declaration?.type === "FunctionDeclaration") &&
      declaration.id !== null &&
      BUILT_INS.has(declaration.id.name)
    ) {
      shadowedBuiltIns.add(declaration.id.name);
    }
  }

  return { aliases, interfaces, shadowedBuiltIns, sourceCode };
}

function typeReferenceName(type: ESTree.TSTypeReference): string | null {
  return type.typeName.type === "Identifier" ? type.typeName.name : null;
}

function isBuiltIn({
  environment,
  name,
  reference,
}: {
  environment: TypeEnvironment;
  name: string;
  reference: ESTree.TSTypeReference;
}): boolean {
  return (
    BUILT_INS.has(name) &&
    !environment.shadowedBuiltIns.has(name) &&
    !hasTypeDefinition(environment.sourceCode, reference)
  );
}

function resolvedAlias(
  environment: TypeEnvironment,
  reference: ESTree.TSTypeReference,
): ESTree.TSTypeAliasDeclaration | undefined {
  return (
    resolveTypeAlias(environment.sourceCode, reference) ??
    environment.aliases.get(typeReferenceName(reference) ?? "")
  );
}

function resolvedInterfaces(
  environment: TypeEnvironment,
  reference: ESTree.TSTypeReference,
): readonly ESTree.TSInterfaceDeclaration[] | undefined {
  const lexicalInterfaces = resolveTypeInterfaces(
    environment.sourceCode,
    reference,
  );

  return lexicalInterfaces.length > 0
    ? lexicalInterfaces
    : environment.interfaces.get(typeReferenceName(reference) ?? "");
}

function isUnappliedReferenceTo(type: ESTree.TSType, name: string): boolean {
  const unwrapped = unwrapTransparentType(type);

  return (
    unwrapped.type === "TSTypeReference" &&
    typeReferenceName(unwrapped) === name &&
    (unwrapped.typeArguments?.params.length ?? 0) === 0
  );
}

function unwrapTransparentType(type: ESTree.TSType): ESTree.TSType {
  let current = type;
  while (
    current.type === "TSParenthesizedType" ||
    (current.type === "TSTypeOperator" && current.operator === "readonly")
  ) {
    current = current.typeAnnotation;
  }

  return current;
}

function isNeverType(type: ESTree.TSType): boolean {
  return unwrapTransparentType(type).type === "TSNeverKeyword";
}

// ESLint uses `undefined` for absent optional annotations while Oxlint's
// declarations use `null` on these nodes.
function optionalPropertyTypeAnnotation(
  member: ESTree.TSPropertySignature,
): ESTree.TSTypeAnnotation | null | undefined {
  return member.typeAnnotation;
}

function optionalMappedTypeAnnotation(
  type: ESTree.TSMappedType,
): ESTree.TSType | null | undefined {
  return type.typeAnnotation;
}

function isEffectivelyEmptyMember(member: ESTree.TSSignature): boolean {
  if (member.type !== "TSPropertySignature" || !member.optional) {
    return false;
  }

  const typeAnnotation = optionalPropertyTypeAnnotation(member);

  return (
    typeAnnotation !== null &&
    typeAnnotation !== undefined &&
    isNeverType(typeAnnotation.typeAnnotation)
  );
}

function isEffectivelyEmptyTypeLiteral(type: ESTree.TSTypeLiteral): boolean {
  return (
    type.members.length === 0 || type.members.every(isEffectivelyEmptyMember)
  );
}

function isEffectivelyEmptyInterface(
  declarations: readonly ESTree.TSInterfaceDeclaration[],
): boolean {
  if (declarations.length !== 1) {
    return false;
  }

  const [type] = declarations;

  return (
    type?.extends.length === 0 &&
    (type.body.body.length === 0 ||
      type.body.body.every(isEffectivelyEmptyMember))
  );
}

function resolvedSubstitutionArgument({
  base,
  resolving = new Set(),
  type,
}: {
  base: TypeAliasEnvironment;
  resolving?: ReadonlySet<string>;
  type: ESTree.TSType;
}): ESTree.TSType {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type !== "TSTypeReference") {
    return type;
  }

  const name = typeReferenceName(unwrapped);
  if (name === null || resolving.has(name)) {
    return type;
  }

  const substitution = base.get(name);
  if (substitution === undefined) {
    return type;
  }

  const nextResolving = new Set([...resolving, name]);

  return resolvedSubstitutionArgument({
    base,
    resolving: nextResolving,
    type: substitution,
  });
}

function aliasSubstitution({
  alias,
  base,
  type,
}: {
  alias: ESTree.TSTypeAliasDeclaration;
  base: TypeAliasEnvironment;
  type: ESTree.TSTypeReference;
}): TypeAliasEnvironment | null {
  const parameters = alias.typeParameters?.params ?? [];
  const arguments_ = type.typeArguments?.params ?? [];
  const next = new Map(base);
  for (const [index, parameter] of parameters.entries()) {
    const argument = arguments_[index] ?? parameter.default;
    if (argument === null) {
      return null;
    }

    next.set(
      parameter.name.name,
      resolvedSubstitutionArgument({ base: next, type: argument }),
    );
  }

  return next;
}

function unsafeDirectValue({
  environment,
  resolvingAliases,
  substitutions,
  type,
}: {
  environment: TypeEnvironment;
  resolvingAliases: ReadonlySet<string>;
  substitutions: TypeAliasEnvironment;
  type: ESTree.TSType;
}): UnsafeDictionary["unsafeValue"] | null {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSUnknownKeyword") {
    return "unknown";
  }
  if (unwrapped.type === "TSAnyKeyword") {
    return "any";
  }
  if (unwrapped.type === "TSObjectKeyword") {
    return "object";
  }
  if (
    unwrapped.type === "TSTypeLiteral" &&
    isEffectivelyEmptyTypeLiteral(unwrapped)
  ) {
    return "empty-object";
  }
  if (unwrapped.type === "TSUnionType") {
    return unwrapped.types.some(
      (member) =>
        unsafeDirectValue({
          environment,
          type: member,
          substitutions,
          resolvingAliases,
        }) !== null,
    )
      ? "union"
      : null;
  }
  if (unwrapped.type === "TSIntersectionType") {
    const unsafeMembers = unwrapped.types.map((member) =>
      unsafeDirectValue({
        environment,
        resolvingAliases,
        substitutions,
        type: member,
      }),
    );

    if (unsafeMembers.includes("any")) {
      return "any";
    }

    return unsafeMembers.length > 0 &&
      unsafeMembers.every((member) => member !== null)
      ? (unsafeMembers[0] ?? null)
      : null;
  }
  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }

  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return null;
  }
  if (
    TRANSPARENT_WRAPPERS.has(name) &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? null
      : unsafeDirectValue({
          environment,
          type: wrapped,
          substitutions,
          resolvingAliases,
        });
  }

  const substitution = substitutions.get(name);
  if (substitution !== undefined) {
    return isUnappliedReferenceTo(substitution, name)
      ? null
      : unsafeDirectValue({
          environment,
          type: substitution,
          substitutions,
          resolvingAliases,
        });
  }

  const interfaceDeclarations = resolvedInterfaces(environment, unwrapped);
  if (interfaceDeclarations !== undefined) {
    return isEffectivelyEmptyInterface(interfaceDeclarations)
      ? "empty-object"
      : null;
  }

  const alias = resolvedAlias(environment, unwrapped);
  if (alias === undefined || resolvingAliases.has(name)) {
    return null;
  }

  const nextSubstitutions = aliasSubstitution({
    alias,
    base: substitutions,
    type: unwrapped,
  });

  if (nextSubstitutions === null) {
    return null;
  }

  const nextResolving = new Set([...resolvingAliases, name]);

  return unsafeDirectValue({
    environment,
    resolvingAliases: nextResolving,
    substitutions: nextSubstitutions,
    type: alias.typeAnnotation,
  });
}

function dictionaryValueTypes({
  environment,
  resolvingAliases,
  substitutions,
  type,
}: {
  environment: TypeEnvironment;
  resolvingAliases: ReadonlySet<string>;
  substitutions: TypeAliasEnvironment;
  type: ESTree.TSType;
}): readonly ResolvedType[] {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSTypeLiteral") {
    return unwrapped.members.flatMap((member): readonly ResolvedType[] =>
      member.type === "TSIndexSignature"
        ? [{ type: member.typeAnnotation.typeAnnotation, substitutions }]
        : [],
    );
  }
  if (unwrapped.type === "TSMappedType") {
    const typeAnnotation = optionalMappedTypeAnnotation(unwrapped);

    return typeAnnotation === null || typeAnnotation === undefined
      ? []
      : [{ type: typeAnnotation, substitutions }];
  }
  if (unwrapped.type !== "TSTypeReference") {
    return [];
  }

  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return [];
  }

  const substitution = substitutions.get(name);
  if (substitution !== undefined) {
    return isUnappliedReferenceTo(substitution, name)
      ? []
      : dictionaryValueTypes({
          environment,
          type: substitution,
          substitutions,
          resolvingAliases,
        });
  }
  if (
    TRANSPARENT_WRAPPERS.has(name) &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? []
      : dictionaryValueTypes({
          environment,
          type: wrapped,
          substitutions,
          resolvingAliases,
        });
  }
  if (
    name === "Record" &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const value = unwrapped.typeArguments?.params[1] ?? null;
    return value === null ? [] : [{ type: value, substitutions }];
  }
  if (
    (name === "Map" || name === "ReadonlyMap" || name === "WeakMap") &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const value = unwrapped.typeArguments?.params[1] ?? null;
    return value === null ? [] : [{ type: value, substitutions }];
  }
  if (
    (name === "Pick" || name === "Omit") &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const source = unwrapped.typeArguments?.params[0];

    return source === undefined
      ? []
      : dictionaryValueTypes({
          environment,
          type: source,
          substitutions,
          resolvingAliases,
        });
  }

  const alias = resolvedAlias(environment, unwrapped);
  if (alias === undefined || resolvingAliases.has(name)) {
    return [];
  }

  const nextSubstitutions = aliasSubstitution({
    alias,
    base: substitutions,
    type: unwrapped,
  });

  if (nextSubstitutions === null) {
    return [];
  }

  const nextResolving = new Set([...resolvingAliases, name]);

  return dictionaryValueTypes({
    environment,
    resolvingAliases: nextResolving,
    substitutions: nextSubstitutions,
    type: alias.typeAnnotation,
  });
}

export function classifyUnsafeDictionaryValue(
  valueType: ESTree.TSType,
  environment: TypeEnvironment,
): UnsafeDictionary | null {
  const unsafeValue = unsafeDirectValue({
    environment,
    resolvingAliases: new Set(),
    substitutions: new Map(),
    type: valueType,
  });

  return unsafeValue === null
    ? null
    : { kind: "unsafe-dictionary", unsafeValue };
}

export function classifyUnsafeDictionary(
  type: ESTree.TSType,
  environment: TypeEnvironment,
): UnsafeDictionary | null {
  for (const valueType of dictionaryValueTypes({
    environment,
    resolvingAliases: new Set(),
    substitutions: new Map(),
    type,
  })) {
    const unsafeValue = unsafeDirectValue({
      environment,
      resolvingAliases: new Set(),
      substitutions: valueType.substitutions,
      type: valueType.type,
    });

    if (unsafeValue !== null) {
      return { kind: "unsafe-dictionary", unsafeValue };
    }
  }

  return null;
}

function resolvesToDictionary({
  environment,
  resolvingAliases,
  substitutions,
  type,
}: {
  environment: TypeEnvironment;
  resolvingAliases: ReadonlySet<string>;
  substitutions: TypeAliasEnvironment;
  type: ESTree.TSType;
}): boolean {
  return (
    dictionaryValueTypes({
      environment,
      resolvingAliases,
      substitutions,
      type,
    }).length > 0
  );
}

export function classifyWideningTarget(
  type: ESTree.TSType,
  environment: TypeEnvironment,
): WideningTarget | null {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSUnknownKeyword") {
    return { kind: "unknown" };
  }
  if (unwrapped.type === "TSObjectKeyword") {
    return { kind: "object" };
  }
  if (unwrapped.type === "TSTypeLiteral") {
    if (
      unwrapped.members.some((member) => member.type === "TSIndexSignature")
    ) {
      return { kind: "open dictionary" };
    }

    return unwrapped.members.length > 0 ? { kind: "anonymous object" } : null;
  }
  if (unwrapped.type === "TSMappedType") {
    return { kind: "open dictionary" };
  }
  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }

  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return null;
  }
  if (
    TRANSPARENT_WRAPPERS.has(name) &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? null
      : classifyWideningTarget(wrapped, environment);
  }
  if (
    name === "Record" &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    return { kind: "open dictionary" };
  }

  const alias = resolvedAlias(environment, unwrapped);
  if (alias === undefined) {
    return null;
  }
  if ((alias.typeParameters?.params.length ?? 0) > 0) {
    const substitutions = aliasSubstitution({
      alias,
      base: new Map(),
      type: unwrapped,
    });

    return substitutions !== null &&
      resolvesToDictionary({
        environment,
        type: alias.typeAnnotation,
        substitutions,
        resolvingAliases: new Set([name]),
      })
      ? { kind: "generic container" }
      : null;
  }

  const substitutions = aliasSubstitution({
    alias,
    base: new Map(),
    type: unwrapped,
  });

  if (substitutions === null) {
    return null;
  }

  const resolved = classifyAliasBroadTarget({
    environment,
    type: alias.typeAnnotation,
    substitutions,
    resolvingAliases: new Set([name]),
  });

  return resolved;
}

function isBroadMappedKey({
  environment,
  substitutions,
  type,
}: {
  environment: TypeEnvironment;
  substitutions: TypeAliasEnvironment;
  type: ESTree.TSType;
}): boolean {
  const unwrapped = unwrapTransparentType(type);
  if (
    unwrapped.type === "TSStringKeyword" ||
    unwrapped.type === "TSNumberKeyword" ||
    unwrapped.type === "TSSymbolKeyword"
  ) {
    return true;
  }
  if (unwrapped.type === "TSUnionType") {
    return unwrapped.types.every((member) =>
      isBroadMappedKey({ environment, substitutions, type: member }),
    );
  }
  if (unwrapped.type !== "TSTypeReference") {
    return false;
  }

  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return false;
  }

  const substitution = substitutions.get(name);
  if (
    substitution !== undefined &&
    !isUnappliedReferenceTo(substitution, name)
  ) {
    return isBroadMappedKey({
      environment,
      substitutions,
      type: substitution,
    });
  }

  return (
    name === "PropertyKey" &&
    isBuiltIn({ environment, name, reference: unwrapped })
  );
}

function classifyAliasBroadTarget({
  environment,
  resolvingAliases,
  substitutions,
  type,
}: {
  environment: TypeEnvironment;
  resolvingAliases: ReadonlySet<string>;
  substitutions: TypeAliasEnvironment;
  type: ESTree.TSType;
}): WideningTarget | null {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSUnknownKeyword") {
    return { kind: "unknown" };
  }
  if (unwrapped.type === "TSObjectKeyword") {
    return { kind: "object" };
  }
  if (unwrapped.type === "TSTypeLiteral") {
    return unwrapped.members.some(
      (member) => member.type === "TSIndexSignature",
    )
      ? { kind: "open dictionary" }
      : null;
  }
  if (unwrapped.type === "TSMappedType") {
    return isBroadMappedKey({
      environment,
      substitutions,
      type: unwrapped.constraint,
    })
      ? { kind: "open dictionary" }
      : null;
  }
  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }

  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return null;
  }

  const substitution = substitutions.get(name);
  if (substitution !== undefined) {
    return isUnappliedReferenceTo(substitution, name)
      ? null
      : classifyAliasBroadTarget({
          environment,
          type: substitution,
          substitutions,
          resolvingAliases,
        });
  }
  if (
    TRANSPARENT_WRAPPERS.has(name) &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? null
      : classifyAliasBroadTarget({
          environment,
          type: wrapped,
          substitutions,
          resolvingAliases,
        });
  }
  if (
    name === "Record" &&
    isBuiltIn({ environment, name, reference: unwrapped })
  ) {
    return { kind: "open dictionary" };
  }

  const alias = resolvedAlias(environment, unwrapped);
  if (alias === undefined || resolvingAliases.has(name)) {
    return null;
  }

  const nextSubstitutions = aliasSubstitution({
    alias,
    base: substitutions,
    type: unwrapped,
  });

  if (nextSubstitutions === null) {
    return null;
  }

  const nextResolving = new Set([...resolvingAliases, name]);

  return classifyAliasBroadTarget({
    environment,
    resolvingAliases: nextResolving,
    substitutions: nextSubstitutions,
    type: alias.typeAnnotation,
  });
}

export function isPopulatedObjectExpression(
  expression: ESTree.Expression,
): boolean {
  let current = expression;
  while (
    current.type === "ParenthesizedExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSTypeAssertion" ||
    current.type === "TSNonNullExpression"
  ) {
    current = current.expression;
  }

  return current.type === "ObjectExpression" && current.properties.length > 0;
}

export function isKnownEvidenceExpression(
  expression: ESTree.Expression,
): boolean {
  let current = expression;
  while (
    current.type === "ParenthesizedExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSTypeAssertion" ||
    current.type === "TSNonNullExpression" ||
    current.type === "TSSatisfiesExpression"
  ) {
    current = current.expression;
  }

  if (current.type === "ObjectExpression") {
    return true;
  }

  return (
    current.type === "ArrayExpression" ||
    current.type === "ArrowFunctionExpression" ||
    current.type === "ClassExpression" ||
    current.type === "FunctionExpression" ||
    current.type === "NewExpression" ||
    current.type === "Literal" ||
    current.type === "TemplateLiteral" ||
    current.type === "UnaryExpression"
  );
}
