import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins";

const moduleMockMethods = new Set(["doMock", "mock", "unstable_mockModule"]);

const ModuleMockOptionsSchema = z.object({
  internalModulePrefixes: z.array(z.string()).optional(),
});

const ModuleMockContextOptionsSchema = z
  .union([ModuleMockOptionsSchema, z.array(ModuleMockOptionsSchema)])
  .nullable();

function resolveVariable(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): Variable | null {
  let scope: Scope | null = sourceCode.getScope(identifier);
  while (scope !== null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) {
      return variable;
    }

    scope = scope.upper;
  }

  return null;
}

function importedName(node: ESTree.Node): string | null {
  if (node.type !== "ImportSpecifier") {
    return null;
  }

  return node.imported.type === "Identifier"
    ? node.imported.name
    : node.imported.value;
}

function isGlobalReference(
  sourceCode: SourceCode,
  expression: ESTree.IdentifierReference,
): boolean {
  const variable = resolveVariable(sourceCode, expression);
  return variable === null || variable.defs.length === 0;
}

function isTestFrameworkObject(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): expression is ESTree.IdentifierReference {
  if (expression.type !== "Identifier") {
    return false;
  }
  if (
    (expression.name === "vi" || expression.name === "jest") &&
    isGlobalReference(sourceCode, expression)
  ) {
    return true;
  }

  const variable = resolveVariable(sourceCode, expression);
  if (variable === null || variable.defs.length === 0) {
    return expression.name === "vi" || expression.name === "jest";
  }

  return variable.defs.some((definition) => {
    if (
      definition.type !== "ImportBinding" ||
      definition.parent?.type !== "ImportDeclaration"
    ) {
      return false;
    }

    const source = definition.parent.source.value;

    const name = importedName(definition.node);

    return (
      (source === "vitest" && name === "vi") ||
      (source === "@jest/globals" && name === "jest")
    );
  });
}

function moduleMockCall(
  sourceCode: SourceCode,
  callee: ESTree.Expression,
): boolean {
  if (
    !("property" in callee) ||
    !("object" in callee) ||
    !("computed" in callee)
  ) {
    return false;
  }
  if (!isTestFrameworkObject(sourceCode, callee.object)) {
    return false;
  }

  const property = callee.property;

  const method = callee.computed
    ? property.type === "Literal" &&
      (property.value === "doMock" ||
        property.value === "mock" ||
        property.value === "unstable_mockModule")
      ? property.value
      : null
    : property.type === "Identifier"
      ? property.name
      : null;

  return method !== null && moduleMockMethods.has(method);
}

function isRepositoryOwnedSpecifier(
  specifier: string,
  internalModulePrefixes: readonly string[],
): boolean {
  return (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#") ||
    internalModulePrefixes.some((prefix) => specifier.startsWith(prefix))
  );
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

/** Ban test framework mocking of repository-owned modules. */
export const noModuleMockingRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Vitest and Jest mocking of repository-owned modules; tests must replace local dependencies through production seams.",
    },
    messages: {
      moduleMock:
        "Replace this local module mock through a production dependency seam and a faithful test implementation.",
    },
    schema: [
      {
        type: "object",
        properties: {
          internalModulePrefixes: {
            type: "array",
            items: { type: "string", minLength: 1 },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ internalModulePrefixes: [] }],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Super" ||
          node.callee.type === "V8IntrinsicExpression"
        ) {
          return;
        }
        if (!moduleMockCall(context.sourceCode, node.callee)) {
          return;
        }

        const rawOptions: unknown = context.options;

        const parsedOptions =
          ModuleMockContextOptionsSchema.safeParse(rawOptions);

        let parsedOption: z.infer<typeof ModuleMockOptionsSchema> | undefined;
        if (parsedOptions.success && parsedOptions.data !== null) {
          parsedOption = Array.isArray(parsedOptions.data)
            ? parsedOptions.data[0]
            : parsedOptions.data;
        }

        const internalModulePrefixes =
          parsedOption?.internalModulePrefixes ?? [];

        const [specifier] = node.arguments;
        if (
          specifier?.type !== "Literal" ||
          !isString(specifier.value) ||
          !isRepositoryOwnedSpecifier(specifier.value, internalModulePrefixes)
        ) {
          return;
        }

        context.report({ node, messageId: "moduleMock" });
      },
    };
  },
});
