import { defineRule } from "@oxlint/plugins";

import type { ESTree, SourceCode } from "@oxlint/plugins";
import {
  getInternalModulePrefixes,
  isRepositoryOwnedModuleSpecifier,
  repositoryModuleRuleSchema,
} from "../shared/repository-module.ts";
import {
  isTestFrameworkControlCall,
  staticMemberName,
} from "../shared/test-framework.ts";

const moduleMockMethods = new Set(["doMock", "mock", "unstable_mockModule"]);

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
    schema: repositoryModuleRuleSchema,
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

        const internalModulePrefixes = getInternalModulePrefixes(
          context.options,
        );

        const specifier = moduleSpecifier(node.arguments[0]);
        if (
          specifier === null ||
          !isRepositoryOwnedModuleSpecifier({
            internalModulePrefixes,
            specifier,
          })
        ) {
          return;
        }

        context.report({ node, messageId: "moduleMock" });
      },
    };
  },
});
