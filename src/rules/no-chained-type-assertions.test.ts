import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"chained">("no-chained-type-assertions", "chained");

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
