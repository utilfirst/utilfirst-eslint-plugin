# consistent-blank-lines

Insert blank lines between statement-list and `JSXChild` items that start a new thought, and remove them between items that continue the same paragraph.

- **Type**: `layout`
- **Fixable**: yes (`--fix`)
- **Configuration**: none (no options)

## Spec

### Statement lists

For `Statement[]` (Program body, BlockStatement body, SwitchCase consequent, StaticBlock body), insert one blank line between two adjacent items (the earlier and the later) when the later starts a new thought, which is the case when its leading comments span multiple lines, or when none of these holds:

- Both are imports, or both are re-exports (`export ... from`, `export *`), with any user-inserted blank line preserved.
- Neither is a hook-call statement (`const x = useFoo()` or a bare `useFoo()` expression statement), and _name flow_: the earlier is single-line and introduces or assigns a name that the later references, neither is a `type` alias, and the later is not a multi-line declaration, a multi-line `return`, or a multi-line `throw` (references inside the body of a nested function declaration, class declaration, or class expression don't count).
- Neither is a hook-call statement, and _matching declarations_: both are single-line `const`/`let` with one declarator each and matching export-ness (`export const` with `export const`, plain `const` with plain `const`), with right-hand sides either both non-calls, or both calls (sharing a callee, or both zero-argument).
- Neither is a hook-call statement, and _matching type aliases_: both are single-line `type` aliases with matching export-ness (`export type` with `export type`, plain `type` with plain `type`).
- Neither is a hook-call statement, and both are `if`s, except when the earlier is a guard `if` (then-branch always terminates via `return`/`throw`/`break`/`continue`, recursively through `block`, `if`, `try`) and the later is not.
- Neither is a hook-call statement, and the earlier is an expression statement while the later is an expression statement, a non-guard `if`, a single-line `return`, a single-line `throw`, `break`, or `continue`.
- Both are hook-call statements and form matching declarations.

### JSX children

For `JSXChild[]` (JSXElement and JSXFragment children, after filtering pure-whitespace `JSXText`), comment-only `JSXExpressionContainer`s (those whose expression is `JSXEmptyExpression`) attach as leading documentation to the next non-comment-only sibling. Insert one blank line between two adjacent non-comment-only items (the earlier and the later) when the later starts a new thought, which is the case when its leading comment-only containers span multiple lines, or when none of these holds:

- The sibling list contains a literal-text node (a `JSXText` with non-whitespace content, or a `JSXExpressionContainer` whose expression yields a string literal directly, via a logical or conditional operator, or as a template literal).
- Both the earlier and the later are single-line.
