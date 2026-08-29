import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const HOOK_ORDER = new Map([
  ["use", 0],
  ["useContext", 0],
  ["useReducer", 1],
  ["useRef", 1],
  ["useState", 1],
  ["useCallback", 2],
  ["useMemo", 2],
  ["useEffect", 3],
  ["useInsertionEffect", 3],
  ["useLayoutEffect", 3],
]);

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

type DirectHookCall = {
  readonly bindingName: string | null;
  readonly call: ESTree.CallExpression;
};

function directCallOf(statement: ESTree.Statement): DirectHookCall | null {
  if (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "CallExpression"
  ) {
    return { bindingName: null, call: statement.expression };
  }
  if (statement.type !== "VariableDeclaration") {
    return null;
  }

  const declaration = statement.declarations[0];
  if (declaration?.init?.type !== "CallExpression") {
    return null;
  }

  return {
    bindingName:
      declaration.id.type === "Identifier" ? declaration.id.name : null,
    call: declaration.init,
  };
}

function hookNameOf(call: ESTree.CallExpression): string | null {
  return call.callee.type === "Identifier" ? call.callee.name : null;
}

/** Keep built-in hooks in context, state, derivation, and effect order. */
export const preferHookOrderRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Order built-in React hooks by context, state, derivation, and effect role.",
    },
    messages: {
      hookOrder:
        "Move `{{hook}}` before later hook families so hooks read as context, state and refs, derivations, then effects.",
    },
  },
  createOnce(context) {
    const checkFunction = (node: FunctionNode) => {
      if (node.body?.type !== "BlockStatement") {
        return;
      }

      let latestOrder = -1;
      const derivationBindings = new Set<string>();
      for (const statement of node.body.body) {
        const directCall = directCallOf(statement);
        if (directCall === null) {
          continue;
        }

        const { bindingName, call } = directCall;
        const hookName = hookNameOf(call);
        const order = hookName === null ? undefined : HOOK_ORDER.get(hookName);
        if (order === undefined) {
          continue;
        }

        if (order === 2 && bindingName !== null) {
          derivationBindings.add(bindingName);
        }
        if (order < latestOrder) {
          const seed = call.arguments[0];
          if (
            order === 1 &&
            seed?.type === "Identifier" &&
            derivationBindings.has(seed.name)
          ) {
            continue;
          }

          context.report({
            node: call,
            messageId: "hookOrder",
            data: { hook: hookName },
          });
          continue;
        }

        latestOrder = order;
      }
    };

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
    };
  },
});
