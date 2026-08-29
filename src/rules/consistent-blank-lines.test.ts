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
  ],
});
