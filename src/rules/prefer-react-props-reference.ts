import type { ESTree, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";
import {
  resolveTypeAlias,
  resolveTypeInterfaces,
} from "../shared/type-alias.ts";

type ComponentFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

const HTTP_METHOD_EXPORT_NAMES = new Set([
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
]);

function componentNameOf(node: ComponentFunction): string | null {
  if (node.type !== "ArrowFunctionExpression") {
    return node.id?.name ?? null;
  }
  if (
    node.parent.type === "VariableDeclarator" &&
    node.parent.id.type === "Identifier"
  ) {
    return node.parent.id.name;
  }

  return null;
}

function isComponent(node: ComponentFunction): boolean {
  const name = componentNameOf(node);

  return (
    name !== null &&
    !HTTP_METHOD_EXPORT_NAMES.has(name) &&
    /^\p{Lu}/u.test(name)
  );
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

function membersHaveChildren(members: readonly ESTree.TSSignature[]): boolean {
  return members.some(
    (member) =>
      member.type === "TSPropertySignature" &&
      !member.computed &&
      propertyNameOf(member.key) === "children",
  );
}

function typeHasChildren({
  resolvingAliases = new Set(),
  sourceCode,
  type,
}: {
  readonly resolvingAliases?: ReadonlySet<ESTree.TSTypeAliasDeclaration>;
  readonly sourceCode: Parameters<typeof resolveTypeAlias>[0];
  readonly type: ESTree.TSType;
}): boolean {
  if (type.type === "TSParenthesizedType") {
    return typeHasChildren({
      resolvingAliases,
      sourceCode,
      type: type.typeAnnotation,
    });
  }
  if (type.type === "TSIntersectionType") {
    return type.types.some((member) =>
      typeHasChildren({ resolvingAliases, sourceCode, type: member }),
    );
  }
  if (type.type === "TSTypeLiteral") {
    return membersHaveChildren(type.members);
  }
  if (type.type !== "TSTypeReference") {
    return false;
  }

  const alias = resolveTypeAlias(sourceCode, type);
  if (
    alias !== null &&
    !resolvingAliases.has(alias) &&
    typeHasChildren({
      resolvingAliases: new Set([...resolvingAliases, alias]),
      sourceCode,
      type: alias.typeAnnotation,
    })
  ) {
    return true;
  }

  return resolveTypeInterfaces(sourceCode, type).some((declaration) =>
    membersHaveChildren(declaration.body.body),
  );
}

function isChildrenReference(
  identifier: Variable["references"][number]["identifier"],
): boolean {
  return (
    identifier.parent.type === "MemberExpression" &&
    !identifier.parent.computed &&
    identifier.parent.object === identifier &&
    identifier.parent.property.type === "Identifier" &&
    identifier.parent.property.name === "children"
  );
}

function patternBinding(
  property: ESTree.BindingProperty,
): ESTree.BindingIdentifier | null {
  if (property.value.type === "Identifier") {
    return property.value;
  }
  if (
    property.value.type === "AssignmentPattern" &&
    property.value.left.type === "Identifier"
  ) {
    return property.value.left;
  }

  return null;
}

function canDestructure(
  sourceCode: Parameters<typeof resolveVariable>[0],
  pattern: ESTree.ObjectPattern,
): boolean {
  if (pattern.properties.length === 0) {
    return false;
  }

  const rest = pattern.properties.find(
    (property) => property.type === "RestElement",
  );

  if (rest !== undefined) {
    if (rest.argument.type !== "Identifier") {
      return false;
    }

    return (
      resolveVariable(sourceCode, rest.argument)?.references.some(
        (reference) =>
          reference.identifier.parent.type === "JSXSpreadAttribute" &&
          reference.identifier.parent.argument === reference.identifier,
      ) ?? false
    );
  }

  return pattern.properties.every((property) => {
    if (property.type !== "Property") {
      return false;
    }

    const binding = patternBinding(property);
    if (binding === null) {
      return false;
    }

    return (
      (resolveVariable(sourceCode, binding)?.references.filter((reference) =>
        reference.isRead(),
      ).length ?? 0) >= 3
    );
  });
}

/** Keep React props available through one named component boundary. */
export const preferReactPropsReferenceRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Keep React component props behind one named parameter and bounded body-local destructuring.",
    },
    messages: {
      canonicalName:
        "Name the React component parameter `props` so prop access has one canonical form.",
      childrenReference:
        "Render `props.children` explicitly when the component props contract declares children.",
      destructureLocally:
        "Keep prop access as `props.X`; destructure inside the body only to strip owned fields before forwarding or when every field is read at least three times.",
      nameProps:
        "Accept one named props parameter and reference fields through it; destructure component-owned fields inside the body when forwarding requires it.",
    },
  },
  createOnce(context) {
    const checkComponent = (node: ComponentFunction) => {
      if (!isComponent(node)) {
        return;
      }

      const parameter = node.params[0];
      if (parameter?.type === "ObjectPattern") {
        context.report({ node: parameter, messageId: "nameProps" });
        return;
      }
      if (parameter?.type !== "Identifier") {
        return;
      }
      if (parameter.name !== "props") {
        context.report({ node: parameter, messageId: "canonicalName" });
        return;
      }

      const variable = resolveVariable(context.sourceCode, parameter);
      for (const reference of variable?.references ?? []) {
        const parent = reference.identifier.parent;
        if (
          parent.type === "VariableDeclarator" &&
          parent.init === reference.identifier &&
          parent.id.type === "ObjectPattern" &&
          !canDestructure(context.sourceCode, parent.id)
        ) {
          context.report({
            node: parent.id,
            messageId: "destructureLocally",
          });
        }
      }

      const annotation = parameter.typeAnnotation?.typeAnnotation;
      if (
        annotation === undefined ||
        !typeHasChildren({ sourceCode: context.sourceCode, type: annotation })
      ) {
        return;
      }

      if (
        variable !== null &&
        !variable.references.some((reference) =>
          isChildrenReference(reference.identifier),
        )
      ) {
        context.report({ node: parameter, messageId: "childrenReference" });
      }
    };

    return {
      ArrowFunctionExpression: checkComponent,
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
    };
  },
});
