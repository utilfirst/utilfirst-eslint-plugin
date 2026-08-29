import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"truthiness">(
  "no-truthy-falsy-assertion",
  "truthiness",
);

const ruleTester = new RuleTester();
ruleTester.run("no-truthy-falsy-assertion", rule, {
  valid: [
    "expect(isReady).toBe(true);",
    "expect(value).toBe('ready');",
    "object.toBeTruthy();",
    "const expect = () => object; expect(value).toBeTruthy();",
  ],
  invalid: [
    {
      code: "expect(value).toBeTruthy();",
      errors: [{ messageId: "truthiness" }],
    },
    {
      code: "expect(value).not['toBeFalsy']();",
      errors: [{ messageId: "truthiness" }],
    },
    {
      code: 'import { expect as verify } from "@jest/globals"; verify(value).toBeTruthy();',
      errors: [{ messageId: "truthiness" }],
    },
    {
      code: 'import * as vitest from "vitest"; vitest.expect(value).toBeFalsy();',
      errors: [{ messageId: "truthiness" }],
    },
  ],
});
