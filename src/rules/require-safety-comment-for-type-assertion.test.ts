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
  "require-safety-comment-for-type-assertion"
] as TSESLint.RuleModule<"missingSafetyComment">;

const ruleTester = new RuleTester();
ruleTester.run("require-safety-comment-for-type-assertion", rule, {
  valid: [
    'const value = { name: "Ada" } as const;',
    "// SAFETY: The schema validated this value.\nconst value = input as string;",
    "const value = (\n  // SAFETY: The framework owns this element.\n  input as HTMLElement\n);",
  ],
  invalid: [
    {
      code: "const value = input as string;",
      errors: [{ messageId: "missingSafetyComment" }],
    },
    {
      code: "const value = <string>input;",
      errors: [{ messageId: "missingSafetyComment" }],
    },
    {
      code: "const value = input as unknown as string;",
      errors: [{ messageId: "missingSafetyComment" }],
    },
    {
      code: "// The schema validated this value.\nconst value = input as string;",
      errors: [{ messageId: "missingSafetyComment" }],
    },
  ],
});
