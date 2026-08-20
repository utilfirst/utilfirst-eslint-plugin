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
  "no-unknown-returns"
] as TSESLint.RuleModule<"unknownReturn">;

const ruleTester = new RuleTester();
ruleTester.run("no-unknown-returns", rule, {
  valid: [
    "function load(): User { return user; }",
    "function infer() { return input; }",
    "function cause(): { cause: unknown } { return { cause: input }; }",
  ],
  invalid: [
    {
      code: "function load(): unknown { return input; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "function load(): Promise<unknown> { return promise; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "type Raw = unknown; function load(): Raw { return input; }",
      errors: [{ messageId: "unknownReturn" }],
    },
  ],
});
