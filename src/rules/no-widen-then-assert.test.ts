import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-widen-then-assert"
] as TSESLint.RuleModule<"widenThenAssert">;

const ruleTester = new RuleTester();
ruleTester.run("no-widen-then-assert", rule, {
  valid: [
    "declare const input: unknown; const parsed = input as string;",
    'const payload: unknown = { name: "Ada" }; consume(payload);',
    'let payload: unknown = { name: "Ada" }; payload = read(); const parsed = payload as { name: string };',
    'const payload = { name: "Ada" }; const parsed = payload as { name: string };',
    "function read(input: unknown) { return input as string; }",
  ],
  invalid: [
    {
      code: 'const payload: unknown = { name: "Ada" }; const parsed = payload as { name: string };',
      errors: [
        {
          messageId: "widenThenAssert",
          data: { name: "payload" },
        },
      ],
    },
    {
      code: 'const payload = { name: "Ada" } as unknown; const parsed = payload as { name: string };',
      errors: [
        {
          messageId: "widenThenAssert",
          data: { name: "payload" },
        },
      ],
    },
    {
      code: 'const payload: object = { name: "Ada" }; const parsed = payload as { name: string };',
      errors: [
        {
          messageId: "widenThenAssert",
          data: { name: "payload" },
        },
      ],
    },
    {
      code: 'const payload: Record<string, unknown> = { name: "Ada" }; const parsed = payload as Record<string, string>;',
      errors: [
        {
          messageId: "widenThenAssert",
          data: { name: "payload" },
        },
      ],
    },
  ],
});
