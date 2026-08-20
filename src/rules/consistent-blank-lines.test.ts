import { RuleTester } from "@typescript-eslint/rule-tester";
import { consistentBlankLines } from "./consistent-blank-lines.ts";

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true, globalReturn: true },
    },
  },
});

ruleTester.run("consistent-blank-lines", consistentBlankLines, {
  valid: [
    {
      name: "adjacent imports stay together",
      code: `import a from "a";\nimport b from "b";\n`,
    },
    {
      name: "user-inserted blank between imports is preserved",
      code: `import a from "a";\n\nimport b from "b";\n`,
    },
    {
      name: "adjacent re-exports stay together",
      code: `export { a } from "a";\nexport { b } from "b";\n`,
    },
    {
      name: "adjacent export-all re-exports stay together",
      code: `export * from "a";\nexport * from "b";\n`,
    },
    {
      name: "user-inserted blank between re-exports is preserved",
      code: `export { a } from "a";\n\nexport { b } from "b";\n`,
    },
    {
      name: "user-inserted blank between test calls is preserved",
      code: `test("a", () => {});\n\ntest("b", () => {});\n`,
    },
    {
      name: "user-inserted blank inside a switch-case consequent is preserved",
      code: `switch (x) {\n  case 1:\n    doA();\n\n    doB();\n    break;\n}\n`,
    },
    {
      name: "name flow keeps single-line decls adjacent",
      code: `const x = 1;\nconst y = x + 1;\n`,
    },
    {
      name: "name flow into an expression-statement use",
      code: `const handler = make();\nregister(handler);\n`,
    },
    {
      name: "name flow into a multi-line non-heavy expression statement",
      code: `const cb = make();\nitems.forEach(\n  cb,\n);\n`,
    },
    {
      name: "name flow through an arrow body reference",
      code: `const x = foo();\nconst f = () => x + 1;\n`,
    },
    {
      name: "name flow from a function declaration",
      code: `function f() {}\nf();\n`,
    },
    {
      name: "name flow from a class declaration",
      code: `class C {}\nnew C();\n`,
    },
    {
      name: "name flow from an interface into a type annotation",
      code: `interface I {}\nconst x: I = y;\n`,
    },
    {
      name: "name flow from an update expression",
      code: `i++;\nuse(i);\n`,
    },
    {
      name: "name flow from an identifier assignment",
      code: `total = compute();\nuse(total);\n`,
    },
    {
      name: "name flow from a member assignment root",
      code: `obj.value = compute();\nuse(obj);\n`,
    },
    {
      name: "name flow from a top-level this assignment",
      code: `this.value = compute();\nuse(this);\n`,
    },
    {
      name: "name flow from a this assignment inside a function",
      code: `function f() {\n  this.value = compute();\n  use(this);\n}\n`,
    },
    {
      name: "name flow from an object-pattern assignment",
      code: `({ a } = obj);\nuse(a);\n`,
    },
    {
      name: "name flow from an array-pattern assignment",
      code: `([a] = arr);\nuse(a);\n`,
    },
    {
      name: "name flow from object destructuring with rest",
      code: `const { a, ...rest } = obj;\nuse(a, rest);\n`,
    },
    {
      name: "name flow from array destructuring with rest",
      code: `const [a, ...rest] = arr;\nuse(a, rest);\n`,
    },
    {
      name: "name flow from destructuring with a default",
      code: `const { a = 1 } = obj;\nuse(a);\n`,
    },
    {
      name: "name flow ignores a destructured param binding",
      code: `const dep = 1;\nconst f = ({ a }) => a + dep;\n`,
    },
    {
      name: "name flow counts a computed destructure key reference",
      code: `const k = getKey();\nconst f = ({ [k]: v }) => v + 1;\n`,
    },
    {
      name: "name flow counts a destructure default reference",
      code: `const dep = getDep();\nconst f = ({ a = dep }) => a + 1;\n`,
    },
    {
      name: "name flow counts a reference past a rest param",
      code: `const dep = getDep();\nconst f = (...args) => args.length + dep;\n`,
    },
    {
      name: "name flow ignores a named function-expression id",
      code: `const dep = 1;\nconst run = function named() { return dep; };\n`,
    },
    {
      name: "name flow ignores an object-literal property key",
      code: `const dep = 1;\nconst o = { key: dep };\n`,
    },
    {
      name: "name flow into a JSX component reference",
      code: `const Comp = makeComp();\nconst node = <Comp></Comp>;\n`,
    },
    {
      name: "name flow into a JSX member component reference",
      code: `const Ns = makeNs();\nconst node = <Ns.Item />;\n`,
    },
    {
      name: "name flow into a lowercase JSX tag with a child reference",
      code: `const value = compute();\nconst node = <div>{value}</div>;\n`,
    },
    {
      name: "matching const calls stay grouped",
      code: `const a = f();\nconst b = f();\n`,
    },
    {
      name: "matching non-call consts stay grouped",
      code: `const a = 1;\nconst b = 2;\n`,
    },
    {
      name: "zero-argument consts with different callees stay separated",
      code: `const a = foo();\n\nconst b = bar();\n`,
    },
    {
      name: "matching consts with equal member callees stay grouped",
      code: `const a = obj.foo();\nconst b = obj.foo();\n`,
    },
    {
      name: "matching consts with this-call callees stay grouped",
      code: `const a = this();\nconst b = this();\n`,
    },
    {
      name: "consts with mismatched callee node types stay separated",
      code: `const a = foo();\n\nconst b = obj.bar();\n`,
    },
    {
      name: "uninitialized matching let pair stays grouped",
      code: `let a;\nlet b;\n`,
    },
    {
      name: "matching consts with computed member callees stay grouped",
      code: `const a = obj[k]();\nconst b = obj[k]();\n`,
    },
    {
      name: "matching consts with chained-call callees stay grouped",
      code: `const a = f()();\nconst b = f()();\n`,
    },
    {
      name: "consts with computed-vs-dotted callees stay separated",
      code: `const a = obj.foo();\n\nconst b = obj[foo]();\n`,
    },
    {
      name: "consts with different member objects stay separated",
      code: `const a = x.foo();\n\nconst b = y.foo();\n`,
    },
    {
      name: "consts with different member properties stay separated",
      code: `const a = obj.foo();\n\nconst b = obj.bar();\n`,
    },
    {
      name: "consts with arrow-IIFE callees stay separated",
      code: `const a = (() => 1)();\n\nconst b = (() => 2)();\n`,
    },
    {
      name: "matching export const pair stays grouped",
      code: `export const a = 1;\nexport const b = 2;\n`,
    },
    {
      name: "matching let pair stays grouped",
      code: `let a = 1;\nlet b = 2;\n`,
    },
    {
      name: "matching type aliases stay grouped",
      code: `type A = string;\ntype B = number;\n`,
    },
    {
      name: "matching export type pair stays grouped",
      code: `export type A = string;\nexport type B = number;\n`,
    },
    {
      name: "two non-guard ifs stay together",
      code: `if (x) a();\nif (y) b();\n`,
    },
    {
      name: "two guard ifs stay together",
      code: `if (x) return;\nif (y) return;\n`,
    },
    {
      name: "guard if then non-guard if needs a blank",
      code: `if (x) return;\n\nif (y) doSomething();\n`,
    },
    {
      name: "if with a non-terminating try is not a guard",
      code: `if (x) {\n  try {\n    risky();\n  } catch {\n    return b;\n  }\n}\nif (y) run();\n`,
    },
    {
      name: "if with an empty block consequent is not a guard",
      code: `if (x) {}\nif (y) run();\n`,
    },
    {
      name: "if with a nested no-else terminator is not a guard",
      code: `if (x) {\n  if (a) return;\n}\nif (y) run();\n`,
    },
    {
      name: "expression then expression stays together",
      code: `doA();\ndoB();\n`,
    },
    {
      name: "expression then single-line return stays together",
      code: `cleanup();\nreturn x;\n`,
    },
    {
      name: "expression then non-guard if stays together",
      code: `init();\nif (x) run();\n`,
    },
    {
      name: "hook-call pair stays grouped",
      code: `const a = useFoo();\nconst b = useBar();\n`,
    },
    {
      name: "hook decl then bare hook needs a blank",
      code: `const ref = useRef();\n\nuseEffect(() => {});\n`,
    },
    {
      name: "blank between unrelated multi-line decls",
      code: `const a = {\n  x: 1,\n};\n\nconst b = 2;\n`,
    },
    {
      name: "matching consts inside a static block stay grouped",
      code: `class C {\n  static {\n    const a = 1;\n    const b = 2;\n  }\n}\n`,
    },
    {
      name: "JSX siblings with literal text stay tight",
      code: `const node = <p>before {value} after</p>;\n`,
    },
    {
      name: "single-line JSX siblings stay tight",
      code: `const node = (\n  <div>\n    <span />\n    <span />\n  </div>\n);\n`,
    },
    {
      name: "JSX fragment siblings stay tight",
      code: `const n = (\n  <>\n    <span />\n    <span />\n  </>\n);\n`,
    },
    {
      name: "single-line comment-only container keeps JSX siblings tight",
      code: `const n = (\n  <div>\n    <a />\n    {/* note */}\n    <b />\n  </div>\n);\n`,
    },
    {
      name: "conditional string container counts as literal text",
      code: `const n = (\n  <p>\n    {cond ? "a" : "b"}\n    <b\n      x={1}\n    />\n  </p>\n);\n`,
    },
    {
      name: "template-literal container counts as literal text",
      code: `const n = (\n  <p>\n    {\`x\`}\n    <b\n      x={1}\n    />\n  </p>\n);\n`,
    },
    {
      name: "logical-expression string container counts as literal text",
      code: `const n = (\n  <p>\n    {cond && "x"}\n    <b\n      x={1}\n    />\n  </p>\n);\n`,
    },
    {
      name: "conditional alternate string container counts as literal text",
      code: `const n = (\n  <p>\n    {cond ? x : "b"}\n    <b\n      x={1}\n    />\n  </p>\n);\n`,
    },
  ],
  invalid: [
    {
      name: "unrelated zero-argument calls start separate paragraphs",
      code: `const a = foo();\nconst b = bar();\n`,
      output: `const a = foo();\n\nconst b = bar();\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "blank between adjacent same-shape consts is removed",
      code: `const a = 1;\n\nconst b = 2;\n`,
      output: `const a = 1;\nconst b = 2;\n`,
      errors: [{ messageId: "extra", line: 3, column: 1 }],
    },
    {
      name: "missing blank between unrelated statements is inserted",
      code: `const a = 1;\nfunction other() {\n  return 2;\n}\n`,
      output: `const a = 1;\n\nfunction other() {\n  return 2;\n}\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "export const and plain const are not matching declarations",
      code: `export const a = 1;\nconst b = 2;\n`,
      output: `export const a = 1;\n\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "var pair is not a matching declaration",
      code: `var a = 1;\nvar b = 2;\n`,
      output: `var a = 1;\n\nvar b = 2;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "extra blank between matching type aliases is removed",
      code: `type A = string;\n\ntype B = number;\n`,
      output: `type A = string;\ntype B = number;\n`,
      errors: [{ messageId: "extra", line: 3, column: 1 }],
    },
    {
      name: "export type and plain type are not matching aliases",
      code: `export type A = string;\ntype B = number;\n`,
      output: `export type A = string;\n\ntype B = number;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "multi-line type alias is not a matching alias pair",
      code: `type A = {\n  x: number;\n};\ntype B = number;\n`,
      output: `type A = {\n  x: number;\n};\n\ntype B = number;\n`,
      errors: [{ messageId: "missing", line: 4, column: 1 }],
    },
    {
      name: "import followed by a statement needs a blank",
      code: `import a from "a";\nconst b = 2;\n`,
      output: `import a from "a";\n\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "statement followed by an import needs a blank",
      code: `const a = 1;\nimport b from "b";\n`,
      output: `const a = 1;\n\nimport b from "b";\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "guard if then non-guard if needs a blank",
      code: `if (x) return;\nif (y) run();\n`,
      output: `if (x) return;\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "guard if with a block consequent needs a blank",
      code: `if (x) {\n  return;\n}\nif (y) run();\n`,
      output: `if (x) {\n  return;\n}\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 4, column: 1 }],
    },
    {
      name: "guard if with a terminating if/else consequent needs a blank",
      code: `if (x) {\n  if (a) return;\n  else throw e;\n}\nif (y) run();\n`,
      output: `if (x) {\n  if (a) return;\n  else throw e;\n}\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 5, column: 1 }],
    },
    {
      name: "guard if with a finally-return try needs a blank",
      code: `if (x) {\n  try {\n    risky();\n  } finally {\n    return a;\n  }\n}\nif (y) run();\n`,
      output: `if (x) {\n  try {\n    risky();\n  } finally {\n    return a;\n  }\n}\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 8, column: 1 }],
    },
    {
      name: "guard if with a try/catch that both terminate needs a blank",
      code: `if (x) {\n  try {\n    return a;\n  } catch {\n    return b;\n  }\n}\nif (y) run();\n`,
      output: `if (x) {\n  try {\n    return a;\n  } catch {\n    return b;\n  }\n}\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 8, column: 1 }],
    },
    {
      name: "guard if with a returning block and cleanup finally needs a blank",
      code: `if (x) {\n  try {\n    return a;\n  } finally {\n    cleanup();\n  }\n}\nif (y) run();\n`,
      output: `if (x) {\n  try {\n    return a;\n  } finally {\n    cleanup();\n  }\n}\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 8, column: 1 }],
    },
    {
      name: "blank between two non-guard ifs is removed",
      code: `if (x) a();\n\nif (y) b();\n`,
      output: `if (x) a();\nif (y) b();\n`,
      errors: [{ messageId: "extra", line: 3, column: 1 }],
    },
    {
      name: "if then return needs a blank",
      code: `if (x) y();\nreturn z;\n`,
      output: `if (x) y();\n\nreturn z;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "expression then guard if needs a blank",
      code: `doA();\nif (x) return;\n`,
      output: `doA();\n\nif (x) return;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "expression then multi-line throw needs a blank",
      code: `doA();\nthrow new Error(\n  "x",\n);\n`,
      output: `doA();\n\nthrow new Error(\n  "x",\n);\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "multi-line return forces a blank after introducer",
      code: `const x = 1;\nreturn {\n  x,\n};\n`,
      output: `const x = 1;\n\nreturn {\n  x,\n};\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "const call then non-call const needs a blank",
      code: `const a = f();\nconst b = 2;\n`,
      output: `const a = f();\n\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "consts with mismatched arg-bearing callees need a blank",
      code: `const a = foo(1);\nconst b = bar(2);\n`,
      output: `const a = foo(1);\n\nconst b = bar(2);\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "single-line multi-declarator const is not a matching pair",
      code: `const a = 1, b = 2;\nconst c = 3;\n`,
      output: `const a = 1, b = 2;\n\nconst c = 3;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "hook decl then non-hook decl needs a blank",
      code: `const a = useFoo();\nconst b = 2;\n`,
      output: `const a = useFoo();\n\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "non-hook decl then hook decl needs a blank",
      code: `const a = 1;\nconst b = useFoo();\n`,
      output: `const a = 1;\n\nconst b = useFoo();\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "reference inside an opaque class body does not flow",
      code: `const dep = foo();\nclass C { m() { return dep; } }\n`,
      output: `const dep = foo();\n\nclass C { m() { return dep; } }\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "shadowed param reference does not flow",
      code: `const x = foo();\nconst f = (x) => x + 1;\n`,
      output: `const x = foo();\n\nconst f = (x) => x + 1;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "multi-line leading comment forces a blank",
      code: `const a = 1;\n// first\n// second\nconst b = 2;\n`,
      output: `const a = 1;\n\n// first\n// second\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 4, column: 1 }],
    },
    {
      name: "extra blank inside a block body is removed",
      code: `function f() {\n  const a = 1;\n\n  const b = 2;\n}\n`,
      output: `function f() {\n  const a = 1;\n  const b = 2;\n}\n`,
      errors: [{ messageId: "extra", line: 4, column: 3 }],
    },
    {
      name: "multi-line JSX sibling forces a blank",
      code: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n    <span />\n  </div>\n);\n`,
      output: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n\n    <span />\n  </div>\n);\n`,
      errors: [{ messageId: "missing", line: 6, column: 5 }],
    },
    {
      name: "extra blank between single-line JSX siblings is removed",
      code: `const n = (\n  <div>\n    <span />\n\n    <span />\n  </div>\n);\n`,
      output: `const n = (\n  <div>\n    <span />\n    <span />\n  </div>\n);\n`,
      errors: [{ messageId: "extra", line: 5, column: 5 }],
    },
    {
      name: "blank between JSX siblings in a literal-text run is removed",
      code: `const n = (\n  <p>\n    text\n    <a />\n\n    <b />\n  </p>\n);\n`,
      output: `const n = (\n  <p>\n    text\n    <a />\n    <b />\n  </p>\n);\n`,
      errors: [{ messageId: "extra", line: 6, column: 5 }],
    },
    {
      name: "multi-line comment-only container forces a blank",
      code: `const n = (\n  <div>\n    <span />\n    {/* one\n     two */}\n    <b />\n  </div>\n);\n`,
      output: `const n = (\n  <div>\n    <span />\n\n    {/* one\n     two */}\n    <b />\n  </div>\n);\n`,
      errors: [{ messageId: "missing", line: 6, column: 5 }],
    },
  ],
});
