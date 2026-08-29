import { RuleTester } from "@typescript-eslint/rule-tester";

import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"invalidTag">(
  "require-special-comment-tag",
  "invalidTag",
);

const ruleTester = new RuleTester();
ruleTester.run("require-special-comment-tag", rule, {
  valid: [
    "// TODO: replace the compatibility boundary\nrun();",
    "// NOTE: the provider owns this value\nrun();",
    "// This documents a todo list.\nrun();",
  ],
  invalid: [
    {
      code: "// todo replace the compatibility boundary\nrun();",
      errors: [{ data: { tag: "TODO" }, messageId: "invalidTag" }],
      output: "// TODO: replace the compatibility boundary\nrun();",
    },
    {
      code: "/* FIXME remove after migration */\nrun();",
      errors: [{ data: { tag: "FIXME" }, messageId: "invalidTag" }],
      output: "/* FIXME: remove after migration */\nrun();",
    },
  ],
});
