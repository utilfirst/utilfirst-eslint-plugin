import { RuleTester } from "@typescript-eslint/rule-tester";
import { expect, test } from "vitest";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"avoid">(
  "no-conditional-empty-object-spread",
  "avoid",
);

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
