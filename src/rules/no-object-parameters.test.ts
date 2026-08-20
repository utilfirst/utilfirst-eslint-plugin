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
  "no-object-parameters"
] as TSESLint.RuleModule<"objectParameter">;

const ruleTester = new RuleTester();
ruleTester.run("no-object-parameters", rule, {
  valid: [
    "function consume<Value extends object>(value: Value) {}",
    "type Owner = { id: string }; function consume(value: Owner) {}",
    "function consume<Value>(value: Value) {}",
    "function outer() { type Value = string; function consume(value: Value) {} }",
  ],
  invalid: [
    {
      code: "function consume(value: object) {}",
      errors: [{ messageId: "objectParameter" }],
    },
    {
      code: "type Input = object; function consume(value: Input) {}",
      errors: [{ messageId: "objectParameter" }],
    },
    {
      code: "type Consumer = (value: object) => void;",
      errors: [{ messageId: "objectParameter" }],
    },
    {
      code: "function consume(...values: object[]) {}",
      errors: [{ messageId: "objectParameter" }],
    },
    {
      code: "function outer() { type Input = object; function consume(value: Input) {} }",
      errors: [{ messageId: "objectParameter" }],
    },
  ],
});
