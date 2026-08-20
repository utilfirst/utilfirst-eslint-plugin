import type { ESTree } from "@oxlint/plugins";
import { z } from "zod";

type VisitorKeys = Readonly<Record<string, readonly string[]>>;

const AstNodeSchema = z.custom<ESTree.Node>(
  (value) => z.object({ type: z.string() }).safeParse(value).success,
);

function collectInferTypeParameterNames({
  names,
  node,
  visitorKeys,
}: {
  names: Set<string>;
  node: ESTree.Node;
  visitorKeys: VisitorKeys;
}): void {
  if (node.type === "TSInferType") {
    names.add(node.typeParameter.name.name);
  }

  const childKeys = visitorKeys[node.type] ?? [];
  for (const [key, value] of Object.entries(node)) {
    if (!childKeys.includes(key)) {
      continue;
    }

    const parsedNode = AstNodeSchema.safeParse(value);
    if (parsedNode.success) {
      collectInferTypeParameterNames({
        names,
        node: parsedNode.data,
        visitorKeys,
      });
      continue;
    }
    if (!Array.isArray(value)) {
      continue;
    }

    for (const child of value) {
      const parsedChild = AstNodeSchema.safeParse(child);
      if (parsedChild.success) {
        collectInferTypeParameterNames({
          names,
          node: parsedChild.data,
          visitorKeys,
        });
      }
    }
  }
}

/** Collect type binders that are in scope at a node and can shadow module aliases. */
export function lexicalTypeParameterNames(
  node: ESTree.Node,
  visitorKeys: VisitorKeys,
): ReadonlySet<string> {
  const names = new Set<string>();
  let descendant: ESTree.Node = node;
  let current: ESTree.Node = node;
  while (current.type !== "Program") {
    if ("typeParameters" in current) {
      for (const parameter of current.typeParameters?.params ?? []) {
        names.add(parameter.name.name);
      }
    }
    if (
      current.type === "TSMappedType" &&
      (descendant === current.nameType || descendant === current.typeAnnotation)
    ) {
      names.add(current.key.name);
    }
    if (
      current.type === "TSConditionalType" &&
      descendant === current.trueType
    ) {
      collectInferTypeParameterNames({
        names,
        node: current.extendsType,
        visitorKeys,
      });
    }

    descendant = current;
    current = current.parent;
  }

  return names;
}
