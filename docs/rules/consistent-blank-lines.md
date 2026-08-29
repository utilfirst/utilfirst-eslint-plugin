# consistent-blank-lines

Apply one explicit gap policy between adjacent statement-list and `JSXChild` items.
- **Type**: `layout`
- **Fixable**: yes (`--fix`)
- **Configuration**: none (no options)

## Gap policies

Each adjacent pair receives one policy:
- **Tight** requires zero blank lines.
- **Separate** requires exactly one blank line.
- **Preserve** leaves the existing gap unchanged.

Tight and Preserve do not split items that share a source line. Separate splits same-line items and inserts one blank line. Fixes retain the file's line-ending sequence and the leading whitespace of the earlier item's source line. Blank-line policy applies outside attached comment groups; spacing inside a comment group is outside this rule's scope.

## Statement lists

The rule checks adjacent items in Program, BlockStatement, SwitchCase consequent, and StaticBlock bodies. It chooses the first matching policy below.
1. **Leading documentation**: A contiguous comment beginning on the current effective ending line attaches to the earlier statement and extends that ending line. Remaining comments before the later statement attach to the later statement. If the later statement's leading comment group spans multiple lines, Separate applies.
2. **Hooks**: A hook call is a direct `use[A-Z]` call in a one-declarator variable declaration or bare expression statement. Export wrappers do not change the classification. If either statement is a hook call, Tight applies only when both are single-line hook variable declarations with matching export-ness. Separate applies to every other hook pair.
3. **User-owned grouping**: Preserve applies when both statements are imports, both are re-exports (`export ... from` or `export *`), or both are non-hook expression statements.
4. **Name flow**: Tight applies when the earlier statement is single-line, introduces or assigns a name, and the later statement references the same lexical binding. Export wrappers are transparent. Type aliases do not participate. A multi-line variable, function, class, interface, return, or throw statement cannot continue name flow. Bodies owned by nested function or class declarations are opaque. Bodies inside expression initializers, including arrow functions, function expressions, and class expressions, remain part of the initializer.
5. **Matching variable declarations**: Tight applies to two single-line, one-declarator `const` or `let` statements with matching export-ness when both initializers are non-calls or both are calls with the same call identity. `const` and `let` can share a tight gap because mutability does not change declaration ownership. A call includes a direct call and a ChainExpression wrapping a call. Call identity consists of the optional-call marker and the exact source text of the callee, so private members, `super`, computed members, optional chains, and intermediate chained-call arguments remain distinguishable.
6. **Matching type aliases**: Tight applies to two single-line type aliases with the same export-ness.
7. **Consecutive conditionals**: Tight applies to two `if` statements unless the earlier statement is a guard and the later statement is not. A branch always terminates when it is `return`, `throw`, `break`, or `continue`; when a block's final statement always terminates; when both branches of an `if` always terminate; or when a `try` finalizer always terminates, or its body and present catch body both always terminate.
8. **Expression continuation**: Tight applies when a non-hook expression statement is followed by a non-guard `if`, a single-line `return`, a single-line `throw`, `break`, or `continue`.
9. **Default**: Separate applies.

## JSX children

The rule filters pure-whitespace `JSXText` children before comparing adjacent non-comment items. Comment-only `JSXExpressionContainer` children attach to the next non-comment child. A trailing comment-only container without a later child is outside this rule's scope. The first matching policy below applies.
1. **Leading documentation**: Separate applies when the later child's attached comment-only group spans multiple lines.
2. **Local text run**: Tight applies when either child is or directly neighbors a literal-text child. A literal-text child is non-whitespace `JSXText` or a `JSXExpressionContainer` guaranteed to produce text or no rendered child: a string literal, a template literal, transparent TypeScript wrappers around either form, a logical `&&` expression whose right side qualifies, or a conditional expression whose two branches qualify.
3. **Visual weight**: Tight applies when both children are single-line.
4. **Default**: Separate applies.
