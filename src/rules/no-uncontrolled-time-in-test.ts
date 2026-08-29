import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { resolveVariable } from "../shared/scope.ts";
import {
  isTestCaseCall,
  isTestFrameworkControlCall,
  isTestHookCall,
  isTestSetupHookCall,
  isTestSuiteCall,
  staticMemberName,
} from "../shared/test-framework.ts";

type WallClockNode = ESTree.CallExpression | ESTree.NewExpression;

type SuiteScope = {
  hasSharedControl: boolean;
};

type ExecutionFrame = {
  hasLocalControl: boolean;
  kind: "hook" | "test";
  sharesControl: boolean;
};

type WallClockRead = {
  hasControl: boolean;
  node: WallClockNode;
  sharedScopes: SuiteScope[];
};

function isGlobalDate(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): boolean {
  const variable = resolveVariable(sourceCode, identifier);
  return variable === null || variable.defs.length === 0;
}

function hasNowOption(expression: ESTree.Expression): boolean {
  if (expression.type !== "ObjectExpression") {
    return false;
  }

  return expression.properties.some((property) => {
    if (property.type !== "Property") {
      return false;
    }
    if (!property.computed && property.key.type === "Identifier") {
      return property.key.name === "now";
    }

    return (
      property.computed &&
      property.key.type === "Literal" &&
      property.key.value === "now"
    );
  });
}

function controlsTime(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (
    node.callee.type !== "MemberExpression" ||
    !isTestFrameworkControlCall(sourceCode, node)
  ) {
    return false;
  }

  const memberName = staticMemberName(node.callee);
  if (memberName === "setSystemTime") {
    return true;
  }
  if (memberName !== "useFakeTimers") {
    return false;
  }

  const [options] = node.arguments;

  return options !== undefined && options.type !== "SpreadElement"
    ? hasNowOption(options)
    : false;
}

function readsDateNow(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  if (
    node.callee.type !== "MemberExpression" ||
    staticMemberName(node.callee) !== "now" ||
    node.callee.object.type !== "Identifier"
  ) {
    return false;
  }

  return (
    node.callee.object.name === "Date" &&
    isGlobalDate(sourceCode, node.callee.object)
  );
}

function readsCurrentDate(
  sourceCode: SourceCode,
  node: ESTree.CallExpression,
): boolean {
  return (
    node.callee.type === "Identifier" &&
    node.callee.name === "Date" &&
    isGlobalDate(sourceCode, node.callee)
  );
}

/** Require tests to control wall-clock inputs. */
export const noUncontrolledTimeInTestRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow uncontrolled wall-clock reads in files that contain tests.",
    },
    messages: {
      uncontrolledTime:
        "Control the test clock before reading the current time, or inject the time as an input.",
    },
  },
  createOnce(context) {
    let hasTestCase = false;
    let functionDepth = 0;
    const executionFrames: ExecutionFrame[] = [];
    const programScope: SuiteScope = { hasSharedControl: false };
    const suiteScopes: SuiteScope[] = [];
    const wallClockReads: WallClockRead[] = [];

    function activeExecution(): ExecutionFrame | undefined {
      return executionFrames.at(-1);
    }

    function currentSharedScopes(): SuiteScope[] {
      return [programScope, ...suiteScopes];
    }

    function registerControl(): void {
      const execution = activeExecution();
      if (execution?.kind === "test") {
        execution.hasLocalControl = true;
        return;
      }

      if (execution?.kind === "hook") {
        execution.hasLocalControl = true;
        if (!execution.sharesControl) {
          return;
        }
      }

      const owner = suiteScopes.at(-1) ?? programScope;
      owner.hasSharedControl = true;
    }

    function registerWallClockRead(node: WallClockNode): void {
      const execution = activeExecution();

      const isDirectSetup = functionDepth === suiteScopes.length;
      if (execution === undefined && !isDirectSetup) {
        return;
      }

      wallClockReads.push({
        hasControl: execution?.hasLocalControl === true,
        node,
        sharedScopes: execution?.kind === "test" ? currentSharedScopes() : [],
      });
    }

    return {
      "Program"() {
        hasTestCase = false;
        functionDepth = 0;
        executionFrames.length = 0;
        programScope.hasSharedControl = false;
        suiteScopes.length = 0;
        wallClockReads.length = 0;
      },
      "CallExpression"(node) {
        if (isTestCaseCall(context.sourceCode, node)) {
          hasTestCase = true;
          executionFrames.push({
            hasLocalControl: false,
            kind: "test",
            sharesControl: false,
          });
        } else if (isTestHookCall(context.sourceCode, node)) {
          executionFrames.push({
            hasLocalControl: false,
            kind: "hook",
            sharesControl: isTestSetupHookCall(context.sourceCode, node),
          });
        } else if (isTestSuiteCall(context.sourceCode, node)) {
          suiteScopes.push({ hasSharedControl: false });
        }
        if (controlsTime(context.sourceCode, node)) {
          registerControl();
        }
        if (
          readsDateNow(context.sourceCode, node) ||
          readsCurrentDate(context.sourceCode, node)
        ) {
          registerWallClockRead(node);
        }
      },
      "CallExpression:exit"(node) {
        if (
          isTestCaseCall(context.sourceCode, node) ||
          isTestHookCall(context.sourceCode, node)
        ) {
          executionFrames.pop();
        } else if (isTestSuiteCall(context.sourceCode, node)) {
          suiteScopes.pop();
        }
      },
      "ArrowFunctionExpression"() {
        functionDepth += 1;
      },
      "ArrowFunctionExpression:exit"() {
        functionDepth -= 1;
      },
      "FunctionDeclaration"() {
        functionDepth += 1;
      },
      "FunctionDeclaration:exit"() {
        functionDepth -= 1;
      },
      "FunctionExpression"() {
        functionDepth += 1;
      },
      "FunctionExpression:exit"() {
        functionDepth -= 1;
      },
      "NewExpression"(node) {
        if (
          node.arguments.length === 0 &&
          node.callee.type === "Identifier" &&
          node.callee.name === "Date" &&
          isGlobalDate(context.sourceCode, node.callee)
        ) {
          registerWallClockRead(node);
        }
      },
      "Program:exit"() {
        if (!hasTestCase) {
          return;
        }

        for (const read of wallClockReads) {
          if (
            !read.hasControl &&
            !read.sharedScopes.some((scope) => scope.hasSharedControl)
          ) {
            context.report({
              node: read.node,
              messageId: "uncontrolledTime",
            });
          }
        }
      },
    };
  },
});
