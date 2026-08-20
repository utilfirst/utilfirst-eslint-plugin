import { defineRule } from "@oxlint/plugins";
import { z } from "zod";

import type { ESTree } from "@oxlint/plugins";

import { isBoundaryDecoder } from "../shared/boundary-decoder.ts";

type RuntimeFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

const RuntimeTypeofOptionsSchema = z.object({
  allowInTypeGuards: z.boolean().optional(),
});

function isRuntimeFunction(node: ESTree.Node): node is RuntimeFunction {
  return (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  );
}

function isInsideAllowedBoundary(
  node: ESTree.Node,
  { allowInTypeGuards }: { allowInTypeGuards: boolean },
): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current !== null && current.type !== "Program") {
    if (
      isRuntimeFunction(current) &&
      (isBoundaryDecoder(current) ||
        (allowInTypeGuards &&
          current.returnType?.typeAnnotation.type === "TSTypePredicate"))
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

/** Keep runtime representation checks inside explicit decoding boundaries. */
export const noRuntimeTypeofRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow runtime typeof checks outside explicit boundary decoders and configured type guards.",
    },
    messages: {
      runtimeTypeof:
        "A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInTypeGuards: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowInTypeGuards: false }],
  },
  createOnce(context) {
    return {
      UnaryExpression(node) {
        const option = context.options[0];
        const parsedOption = RuntimeTypeofOptionsSchema.safeParse(option);

        const allowInTypeGuards =
          parsedOption.success && parsedOption.data.allowInTypeGuards === true;

        if (
          node.operator === "typeof" &&
          !isInsideAllowedBoundary(node, { allowInTypeGuards })
        ) {
          context.report({ node, messageId: "runtimeTypeof" });
        }
      },
    };
  },
});
