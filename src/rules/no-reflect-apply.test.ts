import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"reflectApply">("no-reflect-apply", "reflectApply");

const ruleTester = new RuleTester();
ruleTester.run("no-reflect-apply", rule, {
  valid: [
    "operation.apply(owner, args);",
    "Reflect.get(owner, key);",
    "const Reflect = { apply() {} }; Reflect.apply();",
    "const globalThis = { Reflect: { apply() {} } }; globalThis.Reflect.apply();",
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
    {
      code: "globalThis.Reflect.apply(operation, owner, args);",
      errors: [{ messageId: "reflectApply" }],
    },
    {
      code: 'globalThis["Reflect"]["apply"](operation, owner, args);',
      errors: [{ messageId: "reflectApply" }],
    },
  ],
});
