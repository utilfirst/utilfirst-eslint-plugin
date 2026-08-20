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
  "no-reflect-apply"
] as TSESLint.RuleModule<"reflectApply">;

const ruleTester = new RuleTester();
ruleTester.run("no-reflect-apply", rule, {
  valid: [
    "operation.apply(owner, args);",
    "Reflect.get(owner, key);",
    "const Reflect = { apply() {} }; Reflect.apply();",
  ],
  invalid: [
    {
      code: "Reflect.apply(operation, owner, args);",
      errors: [{ messageId: "reflectApply" }],
    },
    {
      code: 'Reflect["apply"](operation, owner, args);',
      errors: [{ messageId: "reflectApply" }],
    },
  ],
});
