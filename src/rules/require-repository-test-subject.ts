import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { isTestCaseCall } from "../shared/test-framework.ts";

const repositoryPrefixes = [".", "/", "#", "@/", "~/", "cloudflare:"];

function isRepositorySpecifier(specifier: string): boolean {
  return repositoryPrefixes.some((prefix) => specifier.startsWith(prefix));
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
  },
  createOnce(context) {
    let firstTestCall: ESTree.CallExpression | null = null;
    let hasRepositoryImport = false;

    return {
      "Program"() {
        firstTestCall = null;
        hasRepositoryImport = false;
      },
      "ImportDeclaration"(node) {
        if (
          typeof node.source.value === "string" &&
          isRepositorySpecifier(node.source.value)
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
