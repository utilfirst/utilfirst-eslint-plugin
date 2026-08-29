import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

function isPropsSpread(attribute: ESTree.JSXAttributeItem): boolean {
  return (
    attribute.type === "JSXSpreadAttribute" &&
    attribute.argument.type === "Identifier" &&
    attribute.argument.name === "props"
  );
}

/** Put forwarded props before component-controlled JSX attributes. */
export const preferForwardedPropsOrderRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require forwarded props before component-controlled JSX attributes.",
    },
    messages: {
      propsFirst:
        "Spread `{...props}` before component-controlled attributes so the component retains its owned values.",
    },
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        const propsIndex = node.attributes.findIndex(isPropsSpread);
        if (propsIndex <= 0) {
          return;
        }

        context.report({
          node: node.attributes[propsIndex] ?? node,
          messageId: "propsFirst",
        });
      },
    };
  },
});
