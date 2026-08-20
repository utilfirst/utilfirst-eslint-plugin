import type { ESTree } from "@oxlint/plugins";
import { z } from "zod";

type VisitorKeys = Readonly<Record<string, readonly string[]>>;

const AstNodeSchema = z.custom<ESTree.Node>(
  (value) => z.object({ type: z.string() }).safeParse(value).success,
);

function collectInferTypeParameterNames(
  node: ESTree.Node,
  visitorKeys: VisitorKeys,
  names: Set<string>,
): void {
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
      collectInferTypeParameterNames(parsedNode.data, visitorKeys, names);
      continue;
    }
    if (!Array.isArray(value)) {
      continue;
    }

    for (const child of value) {
      const parsedChild = AstNodeSchema.safeParse(child);
      if (parsedChild.success) {
        collectInferTypeParameterNames(parsedChild.data, visitorKeys, names);
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
      collectInferTypeParameterNames(current.extendsType, visitorKeys, names);
    }

    descendant = current;
    current = current.parent;
  }

  return names;
}
