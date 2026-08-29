import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"negatedThrow">(
  "no-negated-throw-assertion",
  "negatedThrow",
);

const ruleTester = new RuleTester();
ruleTester.run("no-negated-throw-assertion", rule, {
  valid: [
    "expect(run).toThrow();",
    "expect(value).not.toEqual('failed');",
    "object.not.toThrow();",
    'import { doesNotThrow } from "./assert"; doesNotThrow(run);',
    "const expect = () => object; expect(run).not.toThrow();",
  ],
  invalid: [
    {
      code: "expect(run).not.toThrow();",
      errors: [{ messageId: "negatedThrow" }],
    },
    {
      code: "expect(run)['not']['toThrowError']();",
      errors: [{ messageId: "negatedThrow" }],
    },
    {
      code: 'import { expect as verify } from "vitest"; verify(run).not.toThrow();',
      errors: [{ messageId: "negatedThrow" }],
    },
    {
      code: "expect(load).resolves.not.toThrow();",
      errors: [{ messageId: "negatedThrow" }],
    },
    {
      code: 'import assert from "node:assert/strict"; assert.doesNotThrow(run);',
      errors: [{ messageId: "negatedThrow" }],
    },
    {
      code: 'import { doesNotReject as settles } from "node:assert/strict"; settles(load());',
      errors: [{ messageId: "negatedThrow" }],
    },
  ],
});
