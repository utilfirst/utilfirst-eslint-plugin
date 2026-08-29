import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

import type { ESTree, SourceCode } from "@oxlint/plugins";
import { ruleContextOptionsSchema } from "../shared/rule-options.ts";
import {
  isTestFrameworkControlCall,
  staticMemberName,
} from "../shared/test-framework.ts";

const moduleMockMethods = new Set(["doMock", "mock", "unstable_mockModule"]);

const ModuleMockOptionsSchema = z.object({
  internalModulePrefixes: z.array(z.string()).optional(),
});

const ModuleMockContextOptionsSchema = ruleContextOptionsSchema(
  ModuleMockOptionsSchema,
);

function moduleMockCall(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (node.callee.type !== "MemberExpression") {
    return false;
  }
  if (!isTestFrameworkControlCall(sourceCode, node)) {
    return false;
  }

  return moduleMockMethods.has(staticMemberName(node.callee) ?? "");
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

function moduleSpecifier(argument: ESTree.Argument | undefined): string | null {
  if (argument?.type === "Literal" && isString(argument.value)) {
    return argument.value;
  }
  if (
    argument?.type === "ImportExpression" &&
    argument.source.type === "Literal" &&
    isString(argument.source.value)
  ) {
    return argument.source.value;
  }

  return null;
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
        if (!moduleMockCall(context.sourceCode, node)) {
          return;
        }

        const rawOptions: unknown = context.options;

        const parsedOptions =
          ModuleMockContextOptionsSchema.safeParse(rawOptions);

        const parsedOption = parsedOptions.success
          ? parsedOptions.data
          : undefined;

        const internalModulePrefixes =
          parsedOption?.internalModulePrefixes ?? [];

        const specifier = moduleSpecifier(node.arguments[0]);
        if (
          specifier === null ||
          !isRepositoryOwnedSpecifier(specifier, internalModulePrefixes)
        ) {
          return;
        }

        context.report({ node, messageId: "moduleMock" });
      },
    };
  },
});
