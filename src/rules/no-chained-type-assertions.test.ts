import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-chained-type-assertions"
] as TSESLint.RuleModule<"chained">;

const ruleTester = new RuleTester();
ruleTester.run("no-chained-type-assertions", rule, {
  valid: [
    "const value = input as string;",
    'const value = { name: "Ada" } as const;',
    'const value = ({ name: "Ada" } as const) as const;',
  ],
  invalid: [
    {
      code: "const value = input as unknown as string;",
      errors: [{ messageId: "chained" }],
    },
    {
      code: "const value = (input as unknown) as string;",
      errors: [{ messageId: "chained" }],
    },
    {
      code: "const value = <string>(<unknown>input);",
      errors: [{ messageId: "chained" }],
    },
  ],
});
