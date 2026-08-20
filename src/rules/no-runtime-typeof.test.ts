import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"runtimeTypeof", [{ allowInTypeGuards?: boolean }]>(
  "no-runtime-typeof",
  "runtimeTypeof",
);

const ruleTester = new RuleTester();
ruleTester.run("no-runtime-typeof", rule, {
  valid: [
    "const value = input;",
    'function parse(value: unknown): string { if (typeof value !== "string") throw new Error(); return value; }',
    {
      code: 'function isString(value: unknown): value is string { return typeof value === "string"; }',
      options: [{ allowInTypeGuards: true }],
    },
    {
      code: 'const isString = (value: unknown): value is string => typeof value === "string";',
      options: [{ allowInTypeGuards: true }],
    },
    {
      code: 'function assertString(value: unknown): asserts value is string { if (typeof value !== "string") throw new Error(); }',
      options: [{ allowInTypeGuards: true }],
    },
  ],
  invalid: [
    {
      code: 'if (typeof input === "string") use(input);',
      errors: [{ messageId: "runtimeTypeof" }],
    },
    {
      code: 'function isString(value: unknown): value is string { const check = () => typeof value === "string"; return check(); }',
      options: [{ allowInTypeGuards: true }],
      errors: [{ messageId: "runtimeTypeof" }],
    },
  ],
});
