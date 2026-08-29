import type { ESTree, SourceCode } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";
import { resolveVariable } from "../shared/scope.ts";
import {
  getTestFrameworkCall,
  isTestFrameworkControlCall,
  staticMemberName,
  type TestFrameworkCall,
  visitExecutedNodes,
} from "../shared/test-framework.ts";

type WallClockNode = ESTree.CallExpression | ESTree.NewExpression;
type TimeEvent = { kind: "control" } | { kind: "read"; node: WallClockNode };

type SuiteExecution = {
  events: TimeEvent[];
  hooks: TestFrameworkCall[];
  suites: SuiteExecution[];
  tests: TestFrameworkCall[];
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

function wallClockRead(
  sourceCode: SourceCode,
  node: ESTree.Node,
): WallClockNode | null {
  if (node.type === "CallExpression") {
    if (
      node.callee.type === "MemberExpression" &&
      staticMemberName(node.callee) === "now" &&
      node.callee.object.type === "Identifier" &&
      node.callee.object.name === "Date" &&
      isGlobalDate(sourceCode, node.callee.object)
    ) {
      return node;
    }
    if (
      node.callee.type === "Identifier" &&
      node.callee.name === "Date" &&
      isGlobalDate(sourceCode, node.callee)
    ) {
      return node;
    }
  }
  if (
    node.type === "NewExpression" &&
    node.arguments.length === 0 &&
    node.callee.type === "Identifier" &&
    node.callee.name === "Date" &&
    isGlobalDate(sourceCode, node.callee)
  ) {
    return node;
  }

  return null;
}

function getTimeEvents({
  root,
  sourceCode,
}: {
  root: Parameters<typeof visitExecutedNodes>[0]["root"];
  sourceCode: SourceCode;
}): TimeEvent[] {
  const events: TimeEvent[] = [];
  visitExecutedNodes({
    root,
    sourceCode,
    visit(node) {
      if (node.type === "CallExpression" && controlsTime(sourceCode, node)) {
        events.push({ kind: "control" });
        return;
      }

      const read = wallClockRead(sourceCode, node);
      if (read !== null) {
        events.push({ kind: "read", node: read });
      }
    },
  });
  return events;
}

function getSuiteExecution({
  root,
  sourceCode,
}: {
  root: Parameters<typeof visitExecutedNodes>[0]["root"];
  sourceCode: SourceCode;
}): SuiteExecution {
  const suite: SuiteExecution = {
    events: getTimeEvents({ root, sourceCode }),
    hooks: [],
    suites: [],
    tests: [],
  };

  visitExecutedNodes({
    root,
    sourceCode,
    visit(node) {
      if (node.type !== "CallExpression") {
        return;
      }

      const frameworkCall = getTestFrameworkCall(sourceCode, node);
      if (frameworkCall === null) {
        return;
      }
      if (frameworkCall.kind === "test") {
        suite.tests.push(frameworkCall);
        return;
      }
      if (frameworkCall.kind === "suite") {
        if (frameworkCall.callback !== null) {
          suite.suites.push(
            getSuiteExecution({
              root: frameworkCall.callback,
              sourceCode,
            }),
          );
        }

        return;
      }

      suite.hooks.push(frameworkCall);
    },
  });
  return suite;
}

function testCountOf(suite: SuiteExecution): number {
  return (
    suite.tests.length +
    suite.suites.reduce(
      (count, childSuite) => count + testCountOf(childSuite),
      0,
    )
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
    const reportedReads = new Set<WallClockNode>();

    function reportUncontrolledEvents({
      events,
      hasInitialControl,
    }: {
      events: readonly TimeEvent[];
      hasInitialControl: boolean;
    }): boolean {
      let hasControl = hasInitialControl;
      for (const event of events) {
        if (event.kind === "control") {
          hasControl = true;
          continue;
        }
        if (hasControl || reportedReads.has(event.node)) {
          continue;
        }

        reportedReads.add(event.node);
        context.report({
          node: event.node,
          messageId: "uncontrolledTime",
        });
      }

      return hasControl;
    }

    function checkSuite({
      suite,
      hasInheritedControl,
    }: {
      suite: SuiteExecution;
      hasInheritedControl: boolean;
    }): void {
      let hasSharedControl = reportUncontrolledEvents({
        events: suite.events,
        hasInitialControl: hasInheritedControl,
      });

      for (const hook of suite.hooks) {
        if (hook.callback === null) {
          continue;
        }

        const hasHookControl = reportUncontrolledEvents({
          events: getTimeEvents({
            root: hook.callback,
            sourceCode: context.sourceCode,
          }),
          hasInitialControl: false,
        });

        if (hook.kind === "setup-hook" && hasHookControl) {
          hasSharedControl = true;
        }
      }

      for (const test of suite.tests) {
        if (test.callback === null) {
          continue;
        }

        reportUncontrolledEvents({
          events: getTimeEvents({
            root: test.callback,
            sourceCode: context.sourceCode,
          }),
          hasInitialControl: hasSharedControl,
        });
      }

      for (const childSuite of suite.suites) {
        checkSuite({
          suite: childSuite,
          hasInheritedControl: hasSharedControl,
        });
      }
    }

    return {
      "Program:exit"(node) {
        reportedReads.clear();

        const suite = getSuiteExecution({
          root: node,
          sourceCode: context.sourceCode,
        });

        if (testCountOf(suite) > 0) {
          checkSuite({ suite, hasInheritedControl: false });
        }
      },
    };
  },
});
