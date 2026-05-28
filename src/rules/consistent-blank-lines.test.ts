import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";
import { consistentBlankLines } from "./consistent-blank-lines.ts";

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

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
      name: "name flow keeps single-line decls adjacent",
      code: `const x = 1;\nconst y = x + 1;\n`,
    },
    {
      name: "matching const calls stay grouped",
      code: `const a = f();\nconst b = f();\n`,
    },
    {
      name: "matching type aliases stay grouped",
      code: `type A = string;\ntype B = number;\n`,
    },
    {
      name: "guard if then non-guard if needs a blank",
      code: `if (x) return;\n\nif (y) doSomething();\n`,
    },
    {
      name: "hook-call pair stays grouped",
      code: `const a = useFoo();\nconst b = useBar();\n`,
    },
    {
      name: "blank between unrelated multi-line decls",
      code: `const a = {\n  x: 1,\n};\n\nconst b = 2;\n`,
    },
    {
      name: "JSX siblings with literal text stay tight",
      code: `const node = <p>before {value} after</p>;\n`,
    },
    {
      name: "single-line JSX siblings stay tight",
      code: `const node = (\n  <div>\n    <span />\n    <span />\n  </div>\n);\n`,
    },
  ],
  invalid: [
    {
      name: "blank between adjacent same-shape consts is removed",
      code: `const a = 1;\n\nconst b = 2;\n`,
      output: `const a = 1;\nconst b = 2;\n`,
      errors: [{ messageId: "extra" }],
    },
    {
      name: "missing blank between unrelated statements is inserted",
      code: `const a = 1;\nfunction other() {\n  return 2;\n}\n`,
      output: `const a = 1;\n\nfunction other() {\n  return 2;\n}\n`,
      errors: [{ messageId: "missing" }],
    },
    {
      name: "export const and plain const are not matching declarations",
      code: `export const a = 1;\nconst b = 2;\n`,
      output: `export const a = 1;\n\nconst b = 2;\n`,
      errors: [{ messageId: "missing" }],
    },
    {
      name: "multi-line return forces a blank after introducer",
      code: `const x = 1;\nreturn {\n  x,\n};\n`,
      output: `const x = 1;\n\nreturn {\n  x,\n};\n`,
      errors: [{ messageId: "missing" }],
    },
    {
      name: "multi-line leading comment forces a blank",
      code: `const a = 1;\n// first\n// second\nconst b = 2;\n`,
      output: `const a = 1;\n\n// first\n// second\nconst b = 2;\n`,
      errors: [{ messageId: "missing" }],
    },
    {
      name: "multi-line JSX sibling forces a blank",
      code: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n    <span />\n  </div>\n);\n`,
      output: `const node = (\n  <div>\n    <span\n      x={1}\n    />\n\n    <span />\n  </div>\n);\n`,
      errors: [{ messageId: "missing" }],
    },
  ],
});
