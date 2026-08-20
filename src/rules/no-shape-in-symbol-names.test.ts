import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-shape-in-symbol-names"
] as TSESLint.RuleModule<"forbiddenSymbolName">;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("no-shape-in-symbol-names", rule, {
  valid: ["const value = owner.shape;", 'owner["shape"];'],
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
      code: 'const view = <Widget shape="round" />;',
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
  ],
});
