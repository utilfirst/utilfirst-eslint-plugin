import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"missingSafetyComment">(
  "require-safety-comment-for-type-assertion",
  "missingSafetyComment",
);

const ruleTester = new RuleTester();
ruleTester.run("require-safety-comment-for-type-assertion", rule, {
  valid: [
    'const value = { name: "Ada" } as const;',
    "// SAFETY: The schema validated this value.\nconst value = input as string;",
    "const value = (\n  // SAFETY: The framework owns this element.\n  input as HTMLElement\n);",
    "// SAFETY: The parser validated this value.\nconst value = (input as unknown)! as string;",
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
    {
      code: "const value = (input as unknown)! as string;",
      errors: [{ messageId: "missingSafetyComment" }],
    },
  ],
});
