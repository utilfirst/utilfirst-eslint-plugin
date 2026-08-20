import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-known-value-widening"
] as TSESLint.RuleModule<"widening">;

const ruleTester = new RuleTester();
ruleTester.run("no-known-value-widening", rule, {
  valid: [
    "const value: unknown = read();",
    "const handlers: Record<string, Handler> = {};",
    "const handlers: Record<string, Handler> = { start };",
    "const handlers = { start } satisfies Record<string, Handler>;",
    "type Handlers = { start: Handler }; const handlers: Handlers = { start };",
  ],
  invalid: [
    {
      code: "const value: unknown = {};",
      errors: [{ messageId: "widening" }],
    },
    {
      code: "const value: object = { id: 1 };",
      errors: [{ messageId: "widening" }],
    },
    {
      code: "function create(): unknown { return {}; }",
      errors: [{ messageId: "widening" }],
    },
  ],
});
