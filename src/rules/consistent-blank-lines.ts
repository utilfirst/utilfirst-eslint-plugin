// Insert one blank line between two adjacent statements (the earlier and the later) inside a
// `Statement[]` block (Program body, BlockStatement body, SwitchCase consequent, StaticBlock
// body) when the later starts a new thought, which is the case when its leading comments span
// multiple lines, or when none of these holds:
//
//   - Both are imports, or both are re-exports (`export ... from`, `export *`), with any
//     user-inserted blank line preserved.
//   - Neither is a hook-call statement (`const x = useFoo()` or a bare `useFoo()` expression
//     statement), and _name flow_: the earlier is single-line and introduces or assigns a
//     name that the later references, neither is a `type` alias, and the later is not a
//     multi-line declaration, a multi-line `return`, or a multi-line `throw` (references
//     inside the body of a nested function declaration, class declaration, or class
//     expression don't count).
//   - Neither is a hook-call statement, and _matching declarations_: both are single-line
//     `const`/`let` with one declarator each and matching export-ness (`export const` with
//     `export const`, plain `const` with plain `const`), with right-hand sides either both
//     non-calls, or both calls (sharing a callee, or both zero-argument).
//   - Neither is a hook-call statement, and _matching type aliases_: both are single-line
//     `type` aliases with matching export-ness (`export type` with `export type`, plain
//     `type` with plain `type`).
//   - Neither is a hook-call statement, and both are `if`s, except when the earlier is a
//     guard `if` (then-branch always terminates via `return`/`throw`/`break`/`continue`,
//     recursively through `block`, `if`, `try`) and the later is not.
//   - Neither is a hook-call statement, and the earlier is an expression statement while the
//     later is an expression statement, a non-guard `if`, a single-line `return`, a
//     single-line `throw`, `break`, or `continue`.
//   - Both are hook-call statements and form matching declarations.
//
// For `JSXChild[]` (JSXElement and JSXFragment children, after filtering pure-whitespace
// `JSXText`), comment-only `JSXExpressionContainer`s (those whose expression is
// `JSXEmptyExpression`) attach as leading documentation to the next non-comment-only sibling.
// Insert one blank line between two adjacent non-comment-only items (the earlier and the
// later) when the later starts a new thought, which is the case when its leading
// comment-only containers span multiple lines, or when none of these holds:
//
//   - The sibling list contains a literal-text node (a `JSXText` with non-whitespace
//     content, or a `JSXExpressionContainer` whose expression yields a string literal
//     directly, via a logical or conditional operator, or as a template literal).
//   - Both the earlier and the later are single-line.

import {
  AST_NODE_TYPES,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";

type MessageIds = "extra" | "missing";

const SKIP_KEYS = new Set(["parent", "loc", "range", "start", "end"]);

const FN_DECL_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
]);

const IMPORT_SPECIFIER_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ImportSpecifier,
  AST_NODE_TYPES.ImportDefaultSpecifier,
  AST_NODE_TYPES.ImportNamespaceSpecifier,
]);

const OPAQUE_BODY_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.ClassExpression,
]);

const FLOW_PREV_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ExpressionStatement,
  AST_NODE_TYPES.IfStatement,
]);

const FLOW_NEXT_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ExpressionStatement,
  AST_NODE_TYPES.IfStatement,
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement,
]);

// Statement kinds that, when multi-line, always deserve their own paragraph regardless of
// other coupling.
const HEAVY_NEXT_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.VariableDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
]);

const TERMINATING_STATEMENT_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement,
]);

// `parent` is typed non-null on every TSESTree node, but the Program root has no parent at
// runtime. This keeps the `undefined` reachable so guarded ascents terminate.
function parentOf(node: TSESTree.Node): TSESTree.Node | undefined {
  return (node as { parent?: TSESTree.Node }).parent;
}

export const consistentBlankLines: TSESLint.RuleModule<MessageIds> = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Insert blank lines between statement-list and JSXChild items that start a new thought.",
      url: "https://github.com/utilfirst/utilfirst-eslint-plugin/blob/main/docs/rules/consistent-blank-lines.md",
    },
    fixable: "whitespace",
    schema: [],
    messages: {
      extra:
        "Unexpected blank line between statements that continue the same paragraph.",
      missing:
        "Expected a blank line between statements that start new paragraphs.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    function checkBlock(statements: TSESTree.Statement[]) {
      for (let i = 0; i < statements.length - 1; i++) {
        const prev = statements[i];
        const next = statements[i + 1];
        if (prev && next) {
          const leadingComments = sourceCode.getCommentsBefore(next);
          const effectiveStart = leadingComments[0] ?? next;
          checkPair(
            prev,
            next,
            effectiveStart,
            () => sameParagraph(prev, next, sourceCode),
            () =>
              isImportPair(prev, next) ||
              (isReExport(prev) && isReExport(next)),
          );
        }
      }
    }

    function checkJsxChildren(children: TSESTree.JSXChild[]) {
      const siblings: {
        leading: TSESTree.JSXExpressionContainer[];
        node: TSESTree.JSXChild;
      }[] = [];

      let pendingLeading: TSESTree.JSXExpressionContainer[] = [];
      for (const child of children) {
        if (
          child.type === AST_NODE_TYPES.JSXText &&
          child.value.trim() === ""
        ) {
          continue;
        }
        if (isCommentOnlyContainer(child)) {
          pendingLeading.push(child);
          continue;
        }

        siblings.push({ leading: pendingLeading, node: child });
        pendingLeading = [];
      }

      for (let i = 0; i < siblings.length - 1; i++) {
        const prevSibling = siblings[i];
        const nextSibling = siblings[i + 1];
        if (prevSibling && nextSibling) {
          const { node: prev } = prevSibling;
          const { leading, node: next } = nextSibling;
          const effectiveStart = leading[0] ?? next;
          checkPair(
            prev,
            next,
            effectiveStart,
            () => sameJsxParagraph(prev, next, leading),
            () => false,
          );
        }
      }
    }

    function checkPair(
      prev: TSESTree.Node,
      next: TSESTree.Node,
      effectiveStart: TSESTree.Node | TSESTree.Comment,
      isSameParagraph: () => boolean,
      shouldPreserveExtra: () => boolean,
    ) {
      const prevEndLine = prev.loc.end.line;
      const nextStartLine = effectiveStart.loc.start.line;
      if (nextStartLine - prevEndLine < 1) {
        return;
      }

      const isPaddingRequired = !isSameParagraph();
      const paddingCount = nextStartLine - prevEndLine - 1;
      const targetPadding = isPaddingRequired ? 1 : 0;
      if (paddingCount === targetPadding) {
        return;
      }

      // Preserve user grouping (e.g., imports and re-exports): user-inserted blanks within
      // the group are preserved rather than collapsed.
      if (paddingCount > targetPadding && shouldPreserveExtra()) {
        return;
      }

      context.report({
        node: next,
        messageId: paddingCount < targetPadding ? "missing" : "extra",
        fix(fixer) {
          const start = sourceCode.getIndexFromLoc({
            line: prevEndLine + 1,
            column: 0,
          });

          const end = sourceCode.getIndexFromLoc({
            line: nextStartLine,
            column: 0,
          });

          return fixer.replaceTextRange(
            [start, end],
            "\n".repeat(targetPadding),
          );
        },
      });
    }

    return {
      Program(node) {
        checkBlock(node.body);
      },
      BlockStatement(node) {
        checkBlock(node.body);
      },
      SwitchCase(node) {
        checkBlock(node.consequent);
      },
      StaticBlock(node) {
        checkBlock(node.body);
      },
      JSXElement(node) {
        checkJsxChildren(node.children);
      },
      JSXFragment(node) {
        checkJsxChildren(node.children);
      },
    };
  },
};

function sameParagraph(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Multi-line leading comments document `next` as its own thing: a new paragraph regardless
  // of declaration shape.
  if (hasMultiLineLeadingComment(next, sourceCode)) {
    return false;
  }

  // Hook-call statements form their own paragraph: they pair only with another hook-call
  // var decl that satisfies (B).
  const prevHook = isHookStatement(prev);
  const nextHook = isHookStatement(next);
  if (prevHook || nextHook) {
    return prevHook && nextHook && isMatchingVarDeclPair(prev, next);
  }

  return sharesNameFlow(prev, next, sourceCode) || sameShape(prev, next);
}

function isHookStatement(stmt: TSESTree.Statement): boolean {
  if (
    stmt.type === AST_NODE_TYPES.VariableDeclaration &&
    stmt.declarations.length === 1
  ) {
    return isHookCall(stmt.declarations[0].init);
  }
  if (stmt.type === AST_NODE_TYPES.ExpressionStatement) {
    return isHookCall(stmt.expression);
  }

  return false;
}

function sharesNameFlow(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isMultiLine(prev)) {
    return false;
  }

  const nextType = unwrapExport(next).type;
  if (isMultiLine(next) && HEAVY_NEXT_TYPES.has(nextType)) {
    return false;
  }
  // Type aliases never name-flow. They pair only via isMatchingTypeAliasPair.
  if (nextType === AST_NODE_TYPES.TSTypeAliasDeclaration) {
    return false;
  }

  const introduced = collectIntroducedOrAssignedNames(prev);
  if (introduced.size === 0) {
    return false;
  }

  const referenced = collectReferencedNames(next, sourceCode);
  for (const name of introduced) {
    if (referenced.has(name)) {
      return true;
    }
  }

  return false;
}

function isHookCall(node: TSESTree.Node | null): boolean {
  return (
    node?.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    /^use[A-Z]/.test(node.callee.name)
  );
}

function sameShape(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
): boolean {
  if (isImportPair(prev, next)) {
    return true;
  }
  if (isReExport(prev) && isReExport(next)) {
    return true;
  }
  if (isMatchingVarDeclPair(prev, next)) {
    return true;
  }
  if (isMatchingTypeAliasPair(prev, next)) {
    return true;
  }
  if (FLOW_PREV_TYPES.has(prev.type) && FLOW_NEXT_TYPES.has(next.type)) {
    if (HEAVY_NEXT_TYPES.has(next.type) && isMultiLine(next)) {
      return false;
    }

    if (prev.type === AST_NODE_TYPES.IfStatement) {
      if (next.type !== AST_NODE_TYPES.IfStatement) {
        return false;
      }
      if (isGuardIf(prev) && !isGuardIf(next)) {
        return false;
      }
    } else if (next.type === AST_NODE_TYPES.IfStatement && isGuardIf(next)) {
      return false;
    }

    return true;
  }

  return false;
}

function isImportPair(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
): boolean {
  return (
    prev.type === AST_NODE_TYPES.ImportDeclaration &&
    next.type === AST_NODE_TYPES.ImportDeclaration
  );
}

function isReExport(stmt: TSESTree.Statement): boolean {
  return (
    (stmt.type === AST_NODE_TYPES.ExportNamedDeclaration &&
      stmt.source !== null) ||
    stmt.type === AST_NODE_TYPES.ExportAllDeclaration
  );
}

function isMatchingVarDeclPair(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
): boolean {
  const p = unwrapExport(prev);
  const n = unwrapExport(next);
  if (
    p.type !== AST_NODE_TYPES.VariableDeclaration ||
    n.type !== AST_NODE_TYPES.VariableDeclaration
  ) {
    return false;
  }
  if (!isConstOrLet(p) || !isConstOrLet(n)) {
    return false;
  }
  if (isMultiLine(prev) || isMultiLine(next)) {
    return false;
  }
  if (p.declarations.length !== 1 || n.declarations.length !== 1) {
    return false;
  }
  if (!initsMatchByShape(p.declarations[0].init, n.declarations[0].init)) {
    return false;
  }

  // `export const` (public) and plain `const` (local helper) belong to different paragraphs.
  return (
    (prev.type === AST_NODE_TYPES.ExportNamedDeclaration) ===
    (next.type === AST_NODE_TYPES.ExportNamedDeclaration)
  );
}

function isMatchingTypeAliasPair(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
): boolean {
  const p = unwrapExport(prev);
  const n = unwrapExport(next);
  if (
    p.type !== AST_NODE_TYPES.TSTypeAliasDeclaration ||
    n.type !== AST_NODE_TYPES.TSTypeAliasDeclaration
  ) {
    return false;
  }
  if (isMultiLine(prev) || isMultiLine(next)) {
    return false;
  }

  // `export type` (public) and plain `type` (local helper) belong to different paragraphs.
  return (
    (prev.type === AST_NODE_TYPES.ExportNamedDeclaration) ===
    (next.type === AST_NODE_TYPES.ExportNamedDeclaration)
  );
}

function unwrapExport(stmt: TSESTree.Statement): TSESTree.Node {
  if (stmt.type === AST_NODE_TYPES.ExportNamedDeclaration && stmt.declaration) {
    return stmt.declaration;
  }

  return stmt;
}

function isConstOrLet(decl: TSESTree.VariableDeclaration): boolean {
  return decl.kind === "const" || decl.kind === "let";
}

function initsMatchByShape(
  prevInit: TSESTree.Node | null,
  nextInit: TSESTree.Node | null,
): boolean {
  const prevCall = asCall(prevInit);
  const nextCall = asCall(nextInit);
  if (prevCall && nextCall) {
    if (calleesEqual(prevCall.callee, nextCall.callee)) {
      return true;
    }

    return prevCall.arguments.length === 0 && nextCall.arguments.length === 0;
  }
  if (prevCall || nextCall) {
    return false;
  }

  return true;
}

function asCall(expr: TSESTree.Node | null): TSESTree.CallExpression | null {
  if (!expr) {
    return null;
  }
  if (expr.type === AST_NODE_TYPES.CallExpression) {
    return expr;
  }

  return null;
}

function calleesEqual(
  a: TSESTree.Node | null,
  b: TSESTree.Node | null,
): boolean {
  if (!a || a.type !== b?.type) {
    return false;
  }
  if (
    a.type === AST_NODE_TYPES.Identifier &&
    b.type === AST_NODE_TYPES.Identifier
  ) {
    return a.name === b.name;
  }
  if (a.type === AST_NODE_TYPES.ThisExpression) {
    return true;
  }
  if (
    a.type === AST_NODE_TYPES.MemberExpression &&
    b.type === AST_NODE_TYPES.MemberExpression
  ) {
    if (a.computed !== b.computed) {
      return false;
    }
    if (!calleesEqual(a.object, b.object)) {
      return false;
    }
    if (
      !a.computed &&
      a.property.type === AST_NODE_TYPES.Identifier &&
      b.property.type === AST_NODE_TYPES.Identifier
    ) {
      return a.property.name === b.property.name;
    }

    return false;
  }

  // Chained calls: match when the underlying callees match. Arguments at intermediate levels
  // are ignored, and final-level arguments are governed by initsMatchByShape.
  if (
    a.type === AST_NODE_TYPES.CallExpression &&
    b.type === AST_NODE_TYPES.CallExpression
  ) {
    return calleesEqual(a.callee, b.callee);
  }

  return false;
}

function isGuardIf(stmt: TSESTree.Node): boolean {
  return (
    stmt.type === AST_NODE_TYPES.IfStatement &&
    blockAlwaysTerminates(stmt.consequent)
  );
}

function blockAlwaysTerminates(
  node: TSESTree.Node | null | undefined,
): boolean {
  if (!node) {
    return false;
  }
  if (TERMINATING_STATEMENT_TYPES.has(node.type)) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.BlockStatement) {
    const last = node.body[node.body.length - 1];
    return last ? blockAlwaysTerminates(last) : false;
  }
  if (node.type === AST_NODE_TYPES.IfStatement) {
    return (
      Boolean(node.alternate) &&
      blockAlwaysTerminates(node.consequent) &&
      blockAlwaysTerminates(node.alternate)
    );
  }
  if (node.type === AST_NODE_TYPES.TryStatement) {
    if (node.finalizer && blockAlwaysTerminates(node.finalizer)) {
      return true;
    }
    if (!blockAlwaysTerminates(node.block)) {
      return false;
    }
    if (!node.handler) {
      return true;
    }

    return blockAlwaysTerminates(node.handler.body);
  }

  return false;
}

function collectIntroducedOrAssignedNames(
  stmt: TSESTree.Statement,
): Set<string> {
  const set = new Set<string>();

  const s = unwrapExport(stmt);
  if (s.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const decl of s.declarations) {
      collectBindingNames(decl.id, set);
    }
  } else if (s.type === AST_NODE_TYPES.FunctionDeclaration && s.id) {
    set.add(s.id.name);
  } else if (s.type === AST_NODE_TYPES.ClassDeclaration && s.id) {
    set.add(s.id.name);
  } else if (s.type === AST_NODE_TYPES.TSInterfaceDeclaration) {
    set.add(s.id.name);
  } else if (s.type === AST_NODE_TYPES.ExpressionStatement) {
    const expr = s.expression;
    if (expr.type === AST_NODE_TYPES.AssignmentExpression) {
      collectAssignmentRoots(expr.left, set);
    } else if (
      expr.type === AST_NODE_TYPES.UpdateExpression &&
      expr.argument.type === AST_NODE_TYPES.Identifier
    ) {
      set.add(expr.argument.name);
    }
  }

  return set;
}

function collectBindingNames(node: TSESTree.Node | null, set: Set<string>) {
  if (!node) {
    return;
  }

  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      set.add(node.name);
      break;
    case AST_NODE_TYPES.ObjectPattern:
      for (const prop of node.properties) {
        if (prop.type === AST_NODE_TYPES.Property) {
          collectBindingNames(prop.value, set);
        } else {
          collectBindingNames(prop.argument, set);
        }
      }

      break;
    case AST_NODE_TYPES.ArrayPattern:
      for (const el of node.elements) {
        if (el) {
          collectBindingNames(el, set);
        }
      }

      break;
    case AST_NODE_TYPES.RestElement:
      collectBindingNames(node.argument, set);
      break;
    case AST_NODE_TYPES.AssignmentPattern:
      collectBindingNames(node.left, set);
      break;
  }
}

function collectAssignmentRoots(target: TSESTree.Node, set: Set<string>) {
  if (target.type === AST_NODE_TYPES.Identifier) {
    set.add(target.name);
  } else if (target.type === AST_NODE_TYPES.MemberExpression) {
    let root: TSESTree.Node = target;
    while (root.type === AST_NODE_TYPES.MemberExpression) {
      root = root.object;
    }

    if (root.type === AST_NODE_TYPES.Identifier) {
      set.add(root.name);
    } else if (root.type === AST_NODE_TYPES.ThisExpression) {
      set.add("this");
    }
  } else if (
    target.type === AST_NODE_TYPES.ObjectPattern ||
    target.type === AST_NODE_TYPES.ArrayPattern
  ) {
    collectBindingNames(target, set);
  }
}

function collectReferencedNames(
  root: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): Set<string> {
  const set = new Set<string>();
  walk(root, (node) => {
    if (
      node.type === AST_NODE_TYPES.Identifier &&
      !isDeclarationOrPropertyKey(node)
    ) {
      if (resolvesOutsideRoot(node, root, sourceCode)) {
        set.add(node.name);
      }
    } else if (node.type === AST_NODE_TYPES.ThisExpression) {
      if (thisResolvesOutsideRoot(node, root)) {
        set.add("this");
      }
    } else if (
      node.type === AST_NODE_TYPES.JSXIdentifier &&
      isJsxComponentIdentifier(node)
    ) {
      if (resolvesOutsideRoot(node, root, sourceCode)) {
        set.add(node.name);
      }
    }
  });
  return set;
}

function resolvesOutsideRoot(
  idNode: TSESTree.Identifier | TSESTree.JSXIdentifier,
  root: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(idNode);
  while (scope) {
    const variable = scope.variables.find((v) => v.name === idNode.name);
    if (variable) {
      for (const def of variable.defs) {
        if (isInSubtree(def.node, root)) {
          return false;
        }
      }

      return true;
    }

    scope = scope.upper;
  }

  return true;
}

function thisResolvesOutsideRoot(
  thisNode: TSESTree.ThisExpression,
  root: TSESTree.Node,
): boolean {
  let p = parentOf(thisNode);
  while (p) {
    if (
      p.type === AST_NODE_TYPES.FunctionDeclaration ||
      p.type === AST_NODE_TYPES.FunctionExpression
    ) {
      return !isInSubtree(p, root);
    }

    p = parentOf(p);
  }

  return true;
}

function isJsxComponentIdentifier(node: TSESTree.JSXIdentifier): boolean {
  if (!/^[A-Z]/.test(node.name)) {
    return false;
  }

  const parent = node.parent;
  if (
    parent.type === AST_NODE_TYPES.JSXOpeningElement &&
    parent.name === node
  ) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.JSXClosingElement &&
    parent.name === node
  ) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.JSXMemberExpression &&
    parent.object === node
  ) {
    return true;
  }

  return false;
}

function isInSubtree(node: TSESTree.Node, root: TSESTree.Node): boolean {
  let cur: TSESTree.Node | undefined = node;
  while (cur) {
    if (cur === root) {
      return true;
    }

    cur = parentOf(cur);
  }

  return false;
}

function isDeclarationOrPropertyKey(idNode: TSESTree.Identifier): boolean {
  const parent = idNode.parent;
  if (
    parent.type === AST_NODE_TYPES.VariableDeclarator &&
    parent.id === idNode
  ) {
    return true;
  }
  if (
    FN_DECL_TYPES.has(parent.type) &&
    "id" in parent &&
    parent.id === idNode
  ) {
    return true;
  }
  if (
    (parent.type === AST_NODE_TYPES.ClassDeclaration ||
      parent.type === AST_NODE_TYPES.ClassExpression) &&
    parent.id === idNode
  ) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.MemberExpression &&
    parent.property === idNode &&
    !parent.computed
  ) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.MethodDefinition &&
    parent.key === idNode &&
    !parent.computed
  ) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.PropertyDefinition &&
    parent.key === idNode &&
    !parent.computed
  ) {
    return true;
  }
  if (
    IMPORT_SPECIFIER_TYPES.has(parent.type) &&
    "local" in parent &&
    parent.local === idNode
  ) {
    return true;
  }

  // Property key in a non-shorthand, non-computed `{key: value}` (whether in an
  // ObjectExpression literal or an ObjectPattern destructure) is a property name string, not a
  // value reference. Shorthand keys flow through so the value reference is captured.
  if (
    parent.type === AST_NODE_TYPES.Property &&
    parent.key === idNode &&
    !parent.computed &&
    !parent.shorthand
  ) {
    return true;
  }
  // Identifier inside a destructuring pattern is a binding name, not a reference.
  if (isInBindingPosition(idNode)) {
    return true;
  }

  return false;
}

function isInBindingPosition(idNode: TSESTree.Identifier): boolean {
  let cur: TSESTree.Node = idNode;
  let p = parentOf(cur);
  while (p) {
    if (
      FN_DECL_TYPES.has(p.type) &&
      "params" in p &&
      Array.isArray(p.params) &&
      (p.params as TSESTree.Node[]).includes(cur)
    ) {
      return true;
    }
    if (
      p.type === AST_NODE_TYPES.ObjectPattern ||
      p.type === AST_NODE_TYPES.ArrayPattern
    ) {
      return true;
    }
    if (p.type === AST_NODE_TYPES.Property) {
      // Computed keys are reference expressions, not bindings.
      if (p.computed && p.key === cur) {
        return false;
      }

      // Non-shorthand: only the value side is a binding. Shorthand: key/value share a node
      // and both sit in value position.
      if (!p.shorthand && p.value !== cur) {
        return false;
      }

      cur = p;
      p = parentOf(p);
      continue;
    }
    if (p.type === AST_NODE_TYPES.AssignmentPattern) {
      // Right side is the default value (a reference expression).
      if (p.right === cur) {
        return false;
      }

      cur = p;
      p = parentOf(p);
      continue;
    }
    if (p.type === AST_NODE_TYPES.RestElement) {
      cur = p;
      p = parentOf(p);
      continue;
    }

    return false;
  }

  return false;
}

function sameJsxParagraph(
  prev: TSESTree.JSXChild,
  next: TSESTree.JSXChild,
  leading: TSESTree.JSXExpressionContainer[],
): boolean {
  // Multi-line leading comment-only containers document `next` as its own thing: a new
  // paragraph regardless of sibling shape.
  const firstLeading = leading[0];
  const lastLeading = leading[leading.length - 1];
  if (
    firstLeading &&
    lastLeading &&
    lastLeading.loc.end.line > firstLeading.loc.start.line
  ) {
    return false;
  }

  // Inline prose: a sibling list that mixes elements with literal-string spacers like {" "}
  // or {", "} reads as one rendered text run.
  if (siblingsIncludeLiteralText(next)) {
    return true;
  }

  // A multi-line sibling next to anything else is a distinct visual chunk. The asymmetric
  // weight reads as its own paragraph regardless of the lighter sibling's shape.
  return !(isMultiLine(prev) || isMultiLine(next));
}

function isCommentOnlyContainer(
  child: TSESTree.JSXChild,
): child is TSESTree.JSXExpressionContainer {
  return (
    child.type === AST_NODE_TYPES.JSXExpressionContainer &&
    child.expression.type === AST_NODE_TYPES.JSXEmptyExpression
  );
}

function siblingsIncludeLiteralText(node: TSESTree.JSXChild): boolean {
  const parent = parentOf(node);
  if (
    !parent ||
    (parent.type !== AST_NODE_TYPES.JSXElement &&
      parent.type !== AST_NODE_TYPES.JSXFragment)
  ) {
    return false;
  }

  for (const sibling of parent.children) {
    if (
      sibling.type === AST_NODE_TYPES.JSXText &&
      sibling.value.trim() !== ""
    ) {
      return true;
    }
    if (
      sibling.type === AST_NODE_TYPES.JSXExpressionContainer &&
      expressionYieldsStringLiteral(sibling.expression)
    ) {
      return true;
    }
  }

  return false;
}

function expressionYieldsStringLiteral(expr: TSESTree.Node): boolean {
  if (expr.type === AST_NODE_TYPES.Literal) {
    return typeof expr.value === "string";
  }
  if (expr.type === AST_NODE_TYPES.TemplateLiteral) {
    return true;
  }
  if (expr.type === AST_NODE_TYPES.LogicalExpression) {
    return expressionYieldsStringLiteral(expr.right);
  }
  if (expr.type === AST_NODE_TYPES.ConditionalExpression) {
    return (
      expressionYieldsStringLiteral(expr.consequent) ||
      expressionYieldsStringLiteral(expr.alternate)
    );
  }

  return false;
}

function walk(
  node: TSESTree.Node | null | undefined,
  fn: (node: TSESTree.Node) => void,
) {
  if (!node || typeof node !== "object" || typeof node.type !== "string") {
    return;
  }

  fn(node);

  const obj = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }

    // Only the body is opaque: params (and their default-value expressions) are walked, so
    // names captured from the surrounding scope still count as references.
    if (key === "body" && OPAQUE_BODY_TYPES.has(node.type)) {
      continue;
    }

    const child = obj[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        walk(c as TSESTree.Node | null, fn);
      }
    } else {
      walk(child as TSESTree.Node | null, fn);
    }
  }
}

function isMultiLine(node: TSESTree.Node): boolean {
  return node.loc.start.line !== node.loc.end.line;
}

function hasMultiLineLeadingComment(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const comments = sourceCode.getCommentsBefore(node);
  if (comments.length === 0) {
    return false;
  }

  const first = comments[0];
  const last = comments[comments.length - 1];
  return Boolean(first && last && last.loc.end.line > first.loc.start.line);
}
