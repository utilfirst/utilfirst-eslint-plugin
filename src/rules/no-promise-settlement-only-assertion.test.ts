import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"fulfillmentOnly" | "rejectionOnly">(
  "no-promise-settlement-only-assertion",
  "fulfillmentOnly",
  "rejectionOnly",
);

const ruleTester = new RuleTester();
ruleTester.run("no-promise-settlement-only-assertion", rule, {
  valid: [
    "expect(load()).resolves.toBe('ready');",
    "expect(load()).resolves.toBeNull();",
    "expect(load()).rejects.toMatchObject({ code: 'FAILED' });",
    "expect(value).toBeUndefined();",
    "const expect = () => object; expect(load()).resolves.toBeUndefined();",
  ],
  invalid: [
    {
      code: "expect(save()).resolves.toBeUndefined();",
      errors: [{ messageId: "fulfillmentOnly" }],
    },
    {
      code: "expect(load()).rejects['toBeDefined']();",
      errors: [{ messageId: "rejectionOnly" }],
    },
    {
      code: 'import { expect as verify } from "vitest"; verify(save()).resolves.toBeUndefined();',
      errors: [{ messageId: "fulfillmentOnly" }],
    },
    {
      code: 'import * as vitest from "vitest"; vitest.expect(load()).rejects.toBeDefined();',
      errors: [{ messageId: "rejectionOnly" }],
    },
  ],
});
