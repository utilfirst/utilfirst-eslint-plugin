import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { expect, test } from "vitest";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-conditional-undefined-properties"
] as TSESLint.RuleModule<"conditionalUndefined">;

const ruleTester = new RuleTester();
ruleTester.run("no-conditional-undefined-properties", rule, {
  valid: [
    "const value = { enabled };",
    "const value = condition ? { enabled } : {};",
    "const value = { enabled: condition ? true : false };",
    'function build(undefined: string, condition: boolean) { return { value: condition ? "set" : undefined }; }',
  ],
  invalid: [
    {
      code: "const value = { enabled: condition ? true : undefined };",
      errors: [{ messageId: "conditionalUndefined" }],
    },
    {
      code: "const value = { enabled: condition ? void 0 : true };",
      errors: [{ messageId: "conditionalUndefined" }],
    },
    {
      code: "const value = { enabled: (condition ? true : undefined) };",
      errors: [{ messageId: "conditionalUndefined" }],
    },
    {
      code: "const value = { enabled: first ? true : second ? false : undefined };",
      errors: [{ messageId: "conditionalUndefined" }],
    },
  ],
});

test("does not offer a property-omission fix", () => {
  expect(rule.meta.fixable).toBeUndefined();
});
