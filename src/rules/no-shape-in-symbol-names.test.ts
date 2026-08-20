import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

type DomainNamesRule = TSESLint.RuleModule<
  "forbiddenSymbolName",
  [{ allowSymbolNames?: string[] }]
>;

// SAFETY: The registry key selects the rule whose message and option contract this test asserts.
const rule = plugin.rules[
  "no-shape-in-symbol-names"
] as TSESLint.RuleModule<"forbiddenSymbolName"> & DomainNamesRule;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("no-shape-in-symbol-names", rule, {
  valid: [
    "const value = owner.shape;",
    'owner["shape"];',
    'const view = <Widget shape="round" />;',
    "const { shape: geometry } = payload;",
    "const { shape } = payload;",
    "import { shape as geometry } from './protocol';",
    "export { geometry as shape };",
    {
      code: "type Shape = Circle | Rectangle;",
      options: [{ allowSymbolNames: ["Shape"] }],
    },
  ],
  invalid: [
    {
      code: "const userShape = value;",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "type UserShape = { id: string };",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "type ShapeResult = { area: number };",
      options: [{ allowSymbolNames: ["Shape"] }],
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: 'import { value as userShape } from "./protocol";',
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "const userShape = value; export { userShape as value };",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
  ],
});
