import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"reflectGet">("no-reflect-get", "reflectGet");

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
