import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const MINIMUM_BRANCH_COUNT = 4;

function discriminatorKey(node: ESTree.Expression): string | null {
  return node.type === "Identifier" ? node.name : null;
}

function comparisonDiscriminator(node: ESTree.Expression): string | null {
  if (node.type !== "BinaryExpression" || node.operator !== "===") {
    return null;
  }
  if (node.right.type === "Literal") {
    return discriminatorKey(node.left);
  }
  if (node.left.type === "Literal") {
    return discriminatorKey(node.right);
  }

  return null;
}

function discriminatorChain(node: ESTree.IfStatement): {
  branchCount: number;
  discriminator: string;
} | null {
  let branchCount = 0;
  let current: ESTree.IfStatement | null = node;
  let discriminator: string | null = null;
  while (current !== null) {
    const branchDiscriminator = comparisonDiscriminator(current.test);
    if (branchDiscriminator === null) {
      return null;
    }
    if (discriminator !== null && discriminator !== branchDiscriminator) {
      return null;
    }

    discriminator = branchDiscriminator;
    branchCount += 1;
    current =
      current.alternate?.type === "IfStatement" ? current.alternate : null;
  }

  return discriminator === null ? null : { branchCount, discriminator };
}

/** Prefer a switch when repeated equality branches dispatch on one value. */
export const preferSwitchDiscriminatorChainRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a switch for four or more equality branches on one discriminator.",
    },
    messages: {
      preferSwitch:
        "This chain has {{branchCount}} equality branches on one discriminator. Replace it with a switch so the finite dispatch structure is explicit.",
    },
  },
  createOnce(context) {
    return {
      IfStatement(node) {
        if (
          node.parent.type === "IfStatement" &&
          node.parent.alternate === node
        ) {
          return;
        }

        const chain = discriminatorChain(node);
        if (chain === null || chain.branchCount < MINIMUM_BRANCH_COUNT) {
          return;
        }

        context.report({
          node,
          messageId: "preferSwitch",
          data: { branchCount: chain.branchCount },
        });
      },
    };
  },
});
