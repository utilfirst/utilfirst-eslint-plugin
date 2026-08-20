// Apply one explicit gap policy to each adjacent pair. Tight requires zero
// blank lines, Separate requires exactly one, and Preserve leaves the existing
// gap unchanged. Leading multi-line documentation always selects Separate.
//
// Statement-list precedence after leading documentation is: hook isolation;
// Preserve for import pairs, re-export pairs, and non-hook expression pairs;
// Tight for name flow, matching variable declarations, matching type aliases,
// consecutive conditionals, and expression continuations; then Separate.
// Export wrappers are transparent to hook and name-flow classification.
// Matching variables have one single-line `const`/`let` declarator, matching
// export-ness, and either two non-call initializers or calls with the same
// optional marker and exact callee source. Function and class declaration
// bodies are opaque to name flow; expression-initializer bodies are not.
//
// JSX precedence after leading documentation is: Tight when either adjacent
// child belongs to a local literal-text run, Tight when both are single-line,
// then Separate. Literal text is non-whitespace `JSXText` or an expression
// guaranteed to render text or nothing through a string, template, transparent
// TypeScript wrapper, qualifying `&&`, or fully qualifying conditional.
// Comment-only containers attach forward; an unattached trailing container is
// outside the rule. Gap fixes preserve line endings and do not normalize
// spacing inside attached comment groups.

import {
  AST_NODE_TYPES,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";

type MessageIds = "extra" | "missing";
type GapPolicy = "preserve" | "separate" | "tight";

type StatementCommentPartition = {
  effectiveEnd: TSESTree.Node | TSESTree.Comment;
  leadingComments: TSESTree.Comment[];
};

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
]);

const EXPRESSION_CONTINUATION_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.IfStatement,
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement,
]);

// Statement kinds whose multi-line form cannot continue name flow.
const HEAVY_NEXT_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.VariableDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSDeclareFunction,
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
]);

const TERMINATING_STATEMENT_TYPES = new Set<AST_NODE_TYPES>([
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement,
]);

// `parent` is typed non-null on every TSESTree node, but the Program root has
// no parent at runtime. This keeps `undefined` reachable so guarded ascents
// terminate.
function parentOf(node: TSESTree.Node): TSESTree.Node | undefined {
  // SAFETY: Parser roots omit `parent` although the declaration marks it as
  // required, so this boundary restores the runtime optionality.
  return (node as { parent?: TSESTree.Node }).parent;
}

export const consistentBlankLines: TSESLint.RuleModule<MessageIds> = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Apply explicit gap policies between adjacent statement-list and JSXChild items.",
      url: "https://github.com/utilfirst/utilfirst-eslint-plugin/blob/main/docs/rules/consistent-blank-lines.md",
    },
    fixable: "whitespace",
    defaultOptions: [],
    schema: [],
    messages: {
      extra: "Unexpected blank line between items that require a tight gap.",
      missing: "Expected one blank line between items that require separation.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const lineBreak = sourceCode.text.includes("\r\n") ? "\r\n" : "\n";

    function checkBlock(statements: TSESTree.Statement[]) {
      for (let i = 0; i < statements.length - 1; i++) {
        const prev = statements[i];
        const next = statements[i + 1];
        if (prev && next) {
          const comments = sourceCode.getCommentsBefore(next);

          const { effectiveEnd, leadingComments } = partitionStatementComments({
            comments,
            prev,
          });

          const effectiveStart = leadingComments[0] ?? next;
          checkPair({
            effectiveEnd,
            effectiveStart,
            next,
            policy: statementGapPolicy({
              leadingComments,
              next,
              prev,
              sourceCode,
            }),
            prev,
          });
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
          checkPair({
            effectiveEnd: prev,
            effectiveStart,
            next,
            policy: jsxGapPolicy({ leading, next, prev }),
            prev,
          });
        }
      }
    }

    function checkPair({
      effectiveEnd,
      effectiveStart,
      next,
      policy,
      prev,
    }: {
      effectiveEnd: TSESTree.Node | TSESTree.Comment;
      effectiveStart: TSESTree.Node | TSESTree.Comment;
      next: TSESTree.Node;
      policy: GapPolicy;
      prev: TSESTree.Node;
    }) {
      if (policy === "preserve") {
        return;
      }

      const prevEndLine = effectiveEnd.loc.end.line;
      const nextStartLine = effectiveStart.loc.start.line;
      if (nextStartLine === prevEndLine) {
        if (policy === "tight") {
          return;
        }

        const indentation = indentationOf(prev, sourceCode);
        context.report({
          node: next,
          messageId: "missing",
          fix: (fixer) =>
            fixer.replaceTextRange(
              [effectiveEnd.range[1], effectiveStart.range[0]],
              `${lineBreak}${lineBreak}${indentation}`,
            ),
        });
        return;
      }

      const paddingCount = nextStartLine - prevEndLine - 1;
      const targetPadding = policy === "separate" ? 1 : 0;
      if (paddingCount === targetPadding) {
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
            lineBreak.repeat(targetPadding),
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

function partitionStatementComments({
  comments,
  prev,
}: {
  comments: TSESTree.Comment[];
  prev: TSESTree.Statement;
}): StatementCommentPartition {
  let effectiveEnd: TSESTree.Node | TSESTree.Comment = prev;
  let leadingIndex = 0;
  while (true) {
    const comment = comments[leadingIndex];
    if (!comment || comment.loc.start.line !== effectiveEnd.loc.end.line) {
      break;
    }

    effectiveEnd = comment;
    leadingIndex++;
  }

  return {
    effectiveEnd,
    leadingComments: comments.slice(leadingIndex),
  };
}

function indentationOf(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): string {
  const lineStart = sourceCode.getIndexFromLoc({
    line: node.loc.start.line,
    column: 0,
  });

  const linePrefix = sourceCode.text.slice(lineStart, node.range[0]);
  return /^[\t ]*/u.exec(linePrefix)?.[0] ?? "";
}

function statementGapPolicy({
  leadingComments,
  next,
  prev,
  sourceCode,
}: {
  leadingComments: TSESTree.Comment[];
  next: TSESTree.Statement;
  prev: TSESTree.Statement;
  sourceCode: TSESLint.SourceCode;
}): GapPolicy {
  if (itemsSpanMultipleLines(leadingComments)) {
    return "separate";
  }

  const prevHook = hookStatementOf(prev);
  const nextHook = hookStatementOf(next);
  if (prevHook || nextHook) {
    return prevHook?.kind === "variable" &&
      nextHook?.kind === "variable" &&
      declarationsHaveSameShell({ next, prev })
      ? "tight"
      : "separate";
  }
  if (
    isImportPair(prev, next) ||
    (isReExport(prev) && isReExport(next)) ||
    isExpressionStatementPair(prev, next)
  ) {
    return "preserve";
  }
  if (
    sharesNameFlow({ next, prev, sourceCode }) ||
    statementsRequireTightGap({ next, prev, sourceCode })
  ) {
    return "tight";
  }

  return "separate";
}

function hookStatementOf(
  stmt: TSESTree.Statement,
): { kind: "expression" | "variable" } | null {
  const declaration = unwrapExport(stmt);
  if (
    declaration.type === AST_NODE_TYPES.VariableDeclaration &&
    declaration.declarations.length === 1 &&
    isHookCall(declaration.declarations[0].init)
  ) {
    return { kind: "variable" };
  }
  if (
    declaration.type === AST_NODE_TYPES.ExpressionStatement &&
    isHookCall(declaration.expression)
  ) {
    return { kind: "expression" };
  }

  return null;
}

function declarationsHaveSameShell({
  next,
  prev,
}: {
  next: TSESTree.Statement;
  prev: TSESTree.Statement;
}): boolean {
  const previousDeclaration = unwrapExport(prev);
  const nextDeclaration = unwrapExport(next);

  return (
    previousDeclaration.type === AST_NODE_TYPES.VariableDeclaration &&
    nextDeclaration.type === AST_NODE_TYPES.VariableDeclaration &&
    isExported(prev) === isExported(next) &&
    !isMultiLine(prev) &&
    !isMultiLine(next) &&
    previousDeclaration.declarations.length === 1 &&
    nextDeclaration.declarations.length === 1
  );
}

function isExported(stmt: TSESTree.Statement): boolean {
  return (
    stmt.type === AST_NODE_TYPES.ExportNamedDeclaration ||
    stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration
  );
}

function sharesNameFlow({
  next,
  prev,
  sourceCode,
}: {
  next: TSESTree.Statement;
  prev: TSESTree.Statement;
  sourceCode: TSESLint.SourceCode;
}): boolean {
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
    /^use[A-Z]/u.test(node.callee.name)
  );
}

function statementsRequireTightGap({
  next,
  prev,
  sourceCode,
}: {
  next: TSESTree.Statement;
  prev: TSESTree.Statement;
  sourceCode: TSESLint.SourceCode;
}): boolean {
  if (isMatchingVarDeclPair({ next, prev, sourceCode })) {
    return true;
  }
  if (isMatchingTypeAliasPair(prev, next)) {
    return true;
  }
  if (
    prev.type === AST_NODE_TYPES.IfStatement &&
    next.type === AST_NODE_TYPES.IfStatement
  ) {
    return !(isGuardIf(prev) && !isGuardIf(next));
  }
  if (
    prev.type === AST_NODE_TYPES.ExpressionStatement &&
    EXPRESSION_CONTINUATION_TYPES.has(next.type)
  ) {
    if (HEAVY_NEXT_TYPES.has(next.type) && isMultiLine(next)) {
      return false;
    }

    return !(next.type === AST_NODE_TYPES.IfStatement && isGuardIf(next));
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

function isExpressionStatementPair(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
): boolean {
  return (
    prev.type === AST_NODE_TYPES.ExpressionStatement &&
    next.type === AST_NODE_TYPES.ExpressionStatement
  );
}

function isReExport(stmt: TSESTree.Statement): boolean {
  return (
    (stmt.type === AST_NODE_TYPES.ExportNamedDeclaration &&
      stmt.source !== null) ||
    stmt.type === AST_NODE_TYPES.ExportAllDeclaration
  );
}

function isMatchingVarDeclPair({
  next,
  prev,
  sourceCode,
}: {
  next: TSESTree.Statement;
  prev: TSESTree.Statement;
  sourceCode: TSESLint.SourceCode;
}): boolean {
  const previousDeclaration = unwrapExport(prev);
  const nextDeclaration = unwrapExport(next);
  if (
    previousDeclaration.type !== AST_NODE_TYPES.VariableDeclaration ||
    nextDeclaration.type !== AST_NODE_TYPES.VariableDeclaration
  ) {
    return false;
  }
  if (!isConstOrLet(previousDeclaration) || !isConstOrLet(nextDeclaration)) {
    return false;
  }
  if (isMultiLine(prev) || isMultiLine(next)) {
    return false;
  }
  if (
    previousDeclaration.declarations.length !== 1 ||
    nextDeclaration.declarations.length !== 1
  ) {
    return false;
  }
  if (
    !initializersBelongTogether({
      nextInit: nextDeclaration.declarations[0].init,
      prevInit: previousDeclaration.declarations[0].init,
      sourceCode,
    })
  ) {
    return false;
  }

  // Public and local declarations require separate gaps.
  return isExported(prev) === isExported(next);
}

function isMatchingTypeAliasPair(
  prev: TSESTree.Statement,
  next: TSESTree.Statement,
): boolean {
  const previousDeclaration = unwrapExport(prev);
  const nextDeclaration = unwrapExport(next);
  if (
    previousDeclaration.type !== AST_NODE_TYPES.TSTypeAliasDeclaration ||
    nextDeclaration.type !== AST_NODE_TYPES.TSTypeAliasDeclaration
  ) {
    return false;
  }
  if (isMultiLine(prev) || isMultiLine(next)) {
    return false;
  }

  // Public and local aliases require separate gaps.
  return isExported(prev) === isExported(next);
}

function unwrapExport(stmt: TSESTree.Statement): TSESTree.Node {
  if (stmt.type === AST_NODE_TYPES.ExportNamedDeclaration && stmt.declaration) {
    return stmt.declaration;
  }
  if (stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    return stmt.declaration;
  }

  return stmt;
}

function isConstOrLet(decl: TSESTree.VariableDeclaration): boolean {
  return decl.kind === "const" || decl.kind === "let";
}

function initializersBelongTogether({
  nextInit,
  prevInit,
  sourceCode,
}: {
  nextInit: TSESTree.Node | null;
  prevInit: TSESTree.Node | null;
  sourceCode: TSESLint.SourceCode;
}): boolean {
  const previousCallIdentity = callIdentityOf(prevInit, sourceCode);
  const nextCallIdentity = callIdentityOf(nextInit, sourceCode);
  if (previousCallIdentity !== null && nextCallIdentity !== null) {
    return previousCallIdentity === nextCallIdentity;
  }
  if (previousCallIdentity !== null || nextCallIdentity !== null) {
    return false;
  }

  return true;
}

function callIdentityOf(
  expr: TSESTree.Node | null,
  sourceCode: TSESLint.SourceCode,
): string | null {
  if (!expr) {
    return null;
  }

  const call =
    expr.type === AST_NODE_TYPES.ChainExpression ? expr.expression : expr;

  if (call.type !== AST_NODE_TYPES.CallExpression) {
    return null;
  }

  const optionalMarker = call.optional ? "optional" : "direct";
  return `${optionalMarker}:${sourceCode.getText(call.callee)}`;
}

function isGuardIf(stmt: TSESTree.Node): boolean {
  return (
    stmt.type === AST_NODE_TYPES.IfStatement &&
    blockAlwaysTerminates(stmt.consequent)
  );
}

function blockAlwaysTerminates(node: TSESTree.Node): boolean {
  if (TERMINATING_STATEMENT_TYPES.has(node.type)) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.BlockStatement) {
    const last = node.body.at(-1);
    return last ? blockAlwaysTerminates(last) : false;
  }
  if (node.type === AST_NODE_TYPES.IfStatement) {
    if (!node.alternate) {
      return false;
    }

    return (
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
  } else if (s.type === AST_NODE_TYPES.TSDeclareFunction && s.id) {
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

function collectBindingNames(node: TSESTree.Node, set: Set<string>) {
  // oxlint-disable-next-line typescript/switch-exhaustiveness-check -- This walker intentionally ignores non-binding nodes.
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
    default:
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
      if (resolvesOutsideRoot({ idNode: node, root, sourceCode })) {
        set.add(node.name);
      }
    } else if (node.type === AST_NODE_TYPES.ThisExpression) {
      if (thisResolvesOutsideRoot(node, root)) {
        set.add("this");
      }
    } else if (
      node.type === AST_NODE_TYPES.JSXIdentifier &&
      isJsxComponentIdentifier(node) &&
      resolvesOutsideRoot({ idNode: node, root, sourceCode })
    ) {
      set.add(node.name);
    }
  });
  return set;
}

function resolvesOutsideRoot({
  idNode,
  root,
  sourceCode,
}: {
  idNode: TSESTree.Identifier | TSESTree.JSXIdentifier;
  root: TSESTree.Node;
  sourceCode: TSESLint.SourceCode;
}): boolean {
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
  let parent = parentOf(thisNode);
  while (parent) {
    if (
      parent.type === AST_NODE_TYPES.FunctionDeclaration ||
      parent.type === AST_NODE_TYPES.FunctionExpression
    ) {
      return !isInSubtree(parent, root);
    }

    parent = parentOf(parent);
  }

  return true;
}

function isJsxComponentIdentifier(node: TSESTree.JSXIdentifier): boolean {
  if (!/^[A-Z]/u.test(node.name)) {
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
    (parent.type === AST_NODE_TYPES.LabeledStatement &&
      parent.label === idNode) ||
    ((parent.type === AST_NODE_TYPES.BreakStatement ||
      parent.type === AST_NODE_TYPES.ContinueStatement) &&
      parent.label === idNode)
  ) {
    return true;
  }
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
    IMPORT_SPECIFIER_TYPES.has(parent.type) &&
    "local" in parent &&
    parent.local === idNode
  ) {
    return true;
  }
  if (parent.type === AST_NODE_TYPES.ImportSpecifier) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.ExportSpecifier &&
    parent.exported === idNode &&
    parent.local !== idNode
  ) {
    return true;
  }
  if (parent.type === AST_NODE_TYPES.MetaProperty) {
    return true;
  }
  if (
    parent.type === AST_NODE_TYPES.TSQualifiedName &&
    parent.right === idNode
  ) {
    return true;
  }
  if (
    (parent.type === AST_NODE_TYPES.MethodDefinition ||
      parent.type === AST_NODE_TYPES.PropertyDefinition ||
      parent.type === AST_NODE_TYPES.AccessorProperty ||
      parent.type === AST_NODE_TYPES.TSMethodSignature ||
      parent.type === AST_NODE_TYPES.TSPropertySignature) &&
    parent.key === idNode &&
    !parent.computed
  ) {
    return true;
  }

  // Property key in a non-shorthand, non-computed `{key: value}` (whether in an
  // ObjectExpression literal or ObjectPattern destructure) is a property-name
  // string, not a value reference. Shorthand keys flow through so the value
  // reference is captured.
  if (
    parent.type === AST_NODE_TYPES.Property &&
    parent.key === idNode &&
    !parent.computed &&
    !parent.shorthand
  ) {
    return true;
  }

  // An identifier inside a destructuring pattern is a binding name, not a
  // reference.
  if (isInBindingPosition(idNode)) {
    return true;
  }

  return false;
}

function isInBindingPosition(idNode: TSESTree.Identifier): boolean {
  let cur: TSESTree.Node = idNode;
  let parent = parentOf(cur);
  while (parent) {
    if (
      FN_DECL_TYPES.has(parent.type) &&
      "params" in parent &&
      Array.isArray(parent.params)
    ) {
      for (const parameter of parent.params) {
        if (parameter === cur) {
          return true;
        }
      }
    }
    if (
      parent.type === AST_NODE_TYPES.ObjectPattern ||
      parent.type === AST_NODE_TYPES.ArrayPattern
    ) {
      return true;
    }
    if (parent.type === AST_NODE_TYPES.Property) {
      // Computed keys are reference expressions, not bindings.
      if (parent.computed && parent.key === cur) {
        return false;
      }

      cur = parent;
      parent = parentOf(parent);
      continue;
    }
    if (parent.type === AST_NODE_TYPES.AssignmentPattern) {
      // Right side is the default value (a reference expression).
      if (parent.right === cur) {
        return false;
      }

      cur = parent;
      parent = parentOf(parent);
      continue;
    }
    if (parent.type === AST_NODE_TYPES.RestElement) {
      cur = parent;
      parent = parentOf(parent);
      continue;
    }

    return false;
  }

  return false;
}

function jsxGapPolicy({
  leading,
  next,
  prev,
}: {
  leading: TSESTree.JSXExpressionContainer[];
  next: TSESTree.JSXChild;
  prev: TSESTree.JSXChild;
}): GapPolicy {
  if (itemsSpanMultipleLines(leading)) {
    return "separate";
  }
  if (isLiteralTextChild(prev) || isLiteralTextChild(next)) {
    return "tight";
  }

  return isMultiLine(prev) || isMultiLine(next) ? "separate" : "tight";
}

function isCommentOnlyContainer(
  child: TSESTree.JSXChild,
): child is TSESTree.JSXExpressionContainer {
  return (
    child.type === AST_NODE_TYPES.JSXExpressionContainer &&
    child.expression.type === AST_NODE_TYPES.JSXEmptyExpression
  );
}

function isLiteralTextChild(child: TSESTree.JSXChild): boolean {
  if (child.type === AST_NODE_TYPES.JSXText) {
    return child.value.trim() !== "";
  }

  return (
    child.type === AST_NODE_TYPES.JSXExpressionContainer &&
    expressionProducesTextOrNothing(child.expression)
  );
}

function expressionProducesTextOrNothing(expr: TSESTree.Node): boolean {
  if (expr.type === AST_NODE_TYPES.Literal) {
    return typeof expr.value === "string";
  }
  if (expr.type === AST_NODE_TYPES.TemplateLiteral) {
    return true;
  }
  if (
    expr.type === AST_NODE_TYPES.TSAsExpression ||
    expr.type === AST_NODE_TYPES.TSTypeAssertion ||
    expr.type === AST_NODE_TYPES.TSNonNullExpression ||
    expr.type === AST_NODE_TYPES.TSSatisfiesExpression
  ) {
    return expressionProducesTextOrNothing(expr.expression);
  }
  if (
    expr.type === AST_NODE_TYPES.LogicalExpression &&
    expr.operator === "&&"
  ) {
    return expressionProducesTextOrNothing(expr.right);
  }
  if (expr.type === AST_NODE_TYPES.ConditionalExpression) {
    return (
      expressionProducesTextOrNothing(expr.consequent) &&
      expressionProducesTextOrNothing(expr.alternate)
    );
  }

  return false;
}

function isNode<Value>(value: Value): value is Value & TSESTree.Node {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function isArray<Value>(value: Value): value is Value & readonly unknown[] {
  return Array.isArray(value);
}

function walk(node: TSESTree.Node, fn: (node: TSESTree.Node) => void) {
  fn(node);

  // SAFETY: ESTree fields are inspected as data and validated with `isNode`
  // before recursive traversal.
  const nodeEntries = Object.entries(node) as [string, unknown][];
  for (const [key, child] of nodeEntries) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }

    // Only the body is opaque: params and their default-value expressions are
    // walked, so names captured from the surrounding scope still count.
    if (key === "body" && OPAQUE_BODY_TYPES.has(node.type)) {
      continue;
    }

    if (isArray(child)) {
      for (const childNode of child) {
        if (isNode(childNode)) {
          walk(childNode, fn);
        }
      }
    } else if (isNode(child)) {
      walk(child, fn);
    }
  }
}

function isMultiLine(node: TSESTree.Node): boolean {
  return node.loc.start.line !== node.loc.end.line;
}

function itemsSpanMultipleLines(
  items: readonly (TSESTree.Node | TSESTree.Comment)[],
): boolean {
  const first = items[0];

  const last = items.at(-1);
  if (!first || !last) {
    return false;
  }

  return last.loc.end.line > first.loc.start.line;
}
