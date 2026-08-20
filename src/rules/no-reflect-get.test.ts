import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-reflect-get"
] as TSESLint.RuleModule<"reflectGet">;

const ruleTester = new RuleTester();
ruleTester.run("no-reflect-get", rule, {
  valid: [
    "const value = owner[key];",
    "Reflect.set(owner, key, value);",
    "const Reflect = { get() {} }; Reflect.get();",
  ],
  invalid: [
    {
      code: "Reflect.get(owner, key);",
      errors: [{ messageId: "reflectGet" }],
    },
    {
      code: 'Reflect["get"](owner, key);',
      errors: [{ messageId: "reflectGet" }],
    },
  ],
});
