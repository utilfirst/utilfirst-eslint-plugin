import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import {
  getInternalModulePrefixes,
  isRepositoryOwnedModuleSpecifier,
  repositoryModuleRuleSchema,
} from "../shared/repository-module.ts";
import { isTestCaseCall } from "../shared/test-framework.ts";

const runtimeRepositoryPrefixes = ["cloudflare:"];

function hasRuntimeImport(node: ESTree.ImportDeclaration): boolean {
  if (node.importKind === "type") {
    return false;
  }
  if (node.specifiers.length === 0) {
    return true;
  }

  return node.specifiers.some(
    (specifier) =>
      specifier.type !== "ImportSpecifier" || specifier.importKind !== "type",
  );
}

/** Require behavioral tests to exercise repository-owned code. */
export const requireRepositoryTestSubjectRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require files containing test cases to import a repository-owned subject.",
    },
    messages: {
      missingSubject:
        "This test file exercises no repository-owned subject. Remove the test or import the behavior it protects.",
    },
    schema: repositoryModuleRuleSchema,
    defaultOptions: [{ internalModulePrefixes: [] }],
  },
  createOnce(context) {
    let firstTestCall: ESTree.CallExpression | null = null;
    let hasRepositoryImport = false;
    let internalModulePrefixes: readonly string[] = [];

    function isRepositorySpecifier(specifier: string): boolean {
      return isRepositoryOwnedModuleSpecifier({
        additionalPrefixes: runtimeRepositoryPrefixes,
        internalModulePrefixes,
        specifier,
      });
    }

    return {
      "Program"() {
        firstTestCall = null;
        hasRepositoryImport = false;
        internalModulePrefixes = getInternalModulePrefixes(context.options);
      },
      "ImportDeclaration"(node) {
        if (
          typeof node.source.value === "string" &&
          isRepositorySpecifier(node.source.value) &&
          hasRuntimeImport(node)
        ) {
          hasRepositoryImport = true;
        }
      },
      "ImportExpression"(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string" &&
          isRepositorySpecifier(node.source.value)
        ) {
          hasRepositoryImport = true;
        }
      },
      "CallExpression"(node) {
        if (
          firstTestCall === null &&
          isTestCaseCall(context.sourceCode, node)
        ) {
          firstTestCall = node;
        }
      },
      "Program:exit"() {
        if (firstTestCall !== null && !hasRepositoryImport) {
          context.report({
            node: firstTestCall,
            messageId: "missingSubject",
          });
        }
      },
    };
  },
});
