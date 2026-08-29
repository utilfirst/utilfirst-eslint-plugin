import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { resolveVariable } from "../shared/scope.ts";
import {
  isTestCaseCall,
  isTestFrameworkControlCall,
  staticMemberName,
} from "../shared/test-framework.ts";

type WallClockNode = ESTree.CallExpression | ESTree.NewExpression;

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
    let hasControlledTime = false;
    let hasTestCase = false;
    const wallClockNodes: WallClockNode[] = [];

    return {
      "Program"() {
        hasControlledTime = false;
        hasTestCase = false;
        wallClockNodes.length = 0;
      },
      "CallExpression"(node) {
        if (isTestCaseCall(context.sourceCode, node)) {
          hasTestCase = true;
        }
        if (controlsTime(context.sourceCode, node)) {
          hasControlledTime = true;
        }
        if (readsDateNow(context.sourceCode, node)) {
          wallClockNodes.push(node);
        }
      },
      "NewExpression"(node) {
        if (
          node.arguments.length === 0 &&
          node.callee.type === "Identifier" &&
          node.callee.name === "Date" &&
          isGlobalDate(context.sourceCode, node.callee)
        ) {
          wallClockNodes.push(node);
        }
      },
      "Program:exit"() {
        if (!hasTestCase || hasControlledTime) {
          return;
        }

        for (const node of wallClockNodes) {
          context.report({ node, messageId: "uncontrolledTime" });
        }
      },
    };
  },
});
