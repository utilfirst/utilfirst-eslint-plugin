import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"widenThenAssert">(
  "no-widen-then-assert",
  "widenThenAssert",
);

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
