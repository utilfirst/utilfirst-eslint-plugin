import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { expect, test } from "vitest";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-conditional-empty-object-spread"
] as TSESLint.RuleModule<"avoid">;

const ruleTester = new RuleTester();
ruleTester.run("no-conditional-empty-object-spread", rule, {
  valid: [
    "const result = { value };",
    "const result = { ...values };",
    "const result = condition ? { value } : {};",
  ],
  invalid: [
    {
      code: "const result = { ...(value !== undefined ? { value } : {}) };",
      errors: [{ messageId: "avoid" }],
    },
    {
      code: "const result = { ...(condition ? {} : { value }) };",
      errors: [{ messageId: "avoid" }],
    },
  ],
});

test("does not offer an unsafe omission-semantics fix", () => {
  expect(rule.meta.fixable).toBeUndefined();
});
