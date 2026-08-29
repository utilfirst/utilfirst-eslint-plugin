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
      name: "preserves a user-inserted blank between imports",
      code: `import a from "a";\n\nimport b from "b";\n`,
    },
    {
      name: "keeps a declaration beside its use",
      code: `const handler = make();\nregister(handler);\n`,
    },
    {
      name: "keeps matching declarations grouped",
      code: `const a = obj.load();\nconst b = obj.load();\n`,
    },
    {
      name: "separates declarations with different call owners",
      code: `const a = left.load();\n\nconst b = right.load();\n`,
    },
    {
      name: "keeps adjacent guards grouped",
      code: `if (x) return;\nif (y) return;\n`,
    },
    {
      name: "separates a hook declaration from a bare hook",
      code: `const ref = useRef();\n\nuseEffect(() => {});\n`,
    },
    {
      name: "keeps JSX siblings in a literal-text run tight",
      code: `const node = (\n  <p>\n    before\n    <span />\n    <span />\n  </p>\n);\n`,
    },
    {
      name: "preserves user grouping between re-exports",
      code: `export { a } from "a";\n\nexport * from "b";\n`,
    },
    {
      name: "keeps matching optional calls grouped",
      code: `const a = owner?.load?.();\nconst b = owner?.load?.();\n`,
    },
  ],
  invalid: [
    {
      name: "inserts a blank between unrelated calls",
      code: `const a = foo();\nconst b = bar();\n`,
      output: `const a = foo();\n\nconst b = bar();\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "removes a blank between matching declarations",
      code: `const a = 1;\n\nconst b = 2;\n`,
      output: `const a = 1;\nconst b = 2;\n`,
      errors: [{ messageId: "extra", line: 3, column: 1 }],
    },
    {
      name: "separates imports from statements",
      code: `import a from "a";\nconst b = 2;\n`,
      output: `import a from "a";\n\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "preserves CRLF while inserting a blank",
      code: `const a = 1;\r\nfunction other() {}\r\n`,
      output: `const a = 1;\r\n\r\nfunction other() {}\r\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "separates a guard from a non-guard",
      code: `if (x) return;\nif (y) run();\n`,
      output: `if (x) return;\n\nif (y) run();\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "separates an expression from a multi-line return",
      code: `const x = 1;\nreturn {\n  x,\n};\n`,
      output: `const x = 1;\n\nreturn {\n  x,\n};\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "does not treat a shadowed parameter as name flow",
      code: `const x = foo();\nconst f = (x) => x + 1;\n`,
      output: `const x = foo();\n\nconst f = (x) => x + 1;\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "separates multi-line JSX siblings",
      code: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n    <span />\n  </div>\n);\n`,
      output: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n\n    <span />\n  </div>\n);\n`,
      errors: [{ messageId: "missing", line: 6, column: 5 }],
    },
    {
      name: "separates same-line unrelated calls",
      code: `const a = foo(); const b = bar();\n`,
      output: `const a = foo();\n\nconst b = bar();\n`,
      errors: [{ messageId: "missing", line: 1, column: 18 }],
    },
    {
      name: "places separation before leading documentation",
      code: `const a = 1;\n/**\n * Documents b.\n */\nconst b = 2;\n`,
      output: `const a = 1;\n\n/**\n * Documents b.\n */\nconst b = 2;\n`,
      errors: [{ messageId: "missing", line: 5, column: 1 }],
    },
    {
      name: "separates unrelated declarations in switch cases",
      code: `switch (kind) {\n  case "ready":\n    const a = foo();\n    const b = bar();\n}\n`,
      output: `switch (kind) {\n  case "ready":\n    const a = foo();\n\n    const b = bar();\n}\n`,
      errors: [{ messageId: "missing", line: 4, column: 5 }],
    },
    {
      name: "separates unrelated declarations in static blocks",
      code: `class Owner {\n  static {\n    const a = foo();\n    const b = bar();\n  }\n}\n`,
      output: `class Owner {\n  static {\n    const a = foo();\n\n    const b = bar();\n  }\n}\n`,
      errors: [{ messageId: "missing", line: 4, column: 5 }],
    },
    {
      name: "distinguishes direct and optional call identities",
      code: `const a = owner.load();\nconst b = owner.load?.();\n`,
      output: `const a = owner.load();\n\nconst b = owner.load?.();\n`,
      errors: [{ messageId: "missing", line: 2, column: 1 }],
    },
    {
      name: "keeps assignment-root name flow tight",
      code: `state.value = load();\n\nconst current = state.value;\n`,
      output: `state.value = load();\nconst current = state.value;\n`,
      errors: [{ messageId: "extra", line: 3, column: 1 }],
    },
    {
      name: "separates a terminating try guard from a branch",
      code: `if (isDone) {\n  try {\n    return;\n  } finally {\n    return;\n  }\n}\nif (isReady) run();\n`,
      output: `if (isDone) {\n  try {\n    return;\n  } finally {\n    return;\n  }\n}\n\nif (isReady) run();\n`,
      errors: [{ messageId: "missing", line: 8, column: 1 }],
    },
    {
      name: "places JSX separation before leading documentation",
      code: `const node = (\n  <div>\n    <span />\n    {/*\n      Documents the next child.\n    */}\n    <span />\n  </div>\n);\n`,
      output: `const node = (\n  <div>\n    <span />\n\n    {/*\n      Documents the next child.\n    */}\n    <span />\n  </div>\n);\n`,
      errors: [{ messageId: "missing", line: 7, column: 5 }],
    },
    {
      name: "keeps conditional JSX text runs tight",
      code: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n\n    {condition ? "yes" : ""}\n\n    <span />\n  </div>\n);\n`,
      output: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n    {condition ? "yes" : ""}\n    <span />\n  </div>\n);\n`,
      errors: [
        { messageId: "extra", line: 7, column: 5 },
        { messageId: "extra", line: 9, column: 5 },
      ],
    },
  ],
});
