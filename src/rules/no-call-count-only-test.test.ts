import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"callCountOnly">(
  "no-call-count-only-test",
  "callCountOnly",
);

const ruleTester = new RuleTester();
ruleTester.run("no-call-count-only-test", rule, {
  valid: [
    'test("result", () => { expect(run()).toBe("ready"); });',
    'test("effect", () => { run(); expect(store.value).toBe("ready"); expect(send).toHaveBeenCalledOnce(); });',
    'test("payload", () => { run(); expect(send).toHaveBeenCalledWith("ready"); });',
    "expect(send).toHaveBeenCalledOnce();",
  ],
  invalid: [
    {
      code: 'test("calls", () => { run(); expect(send).toHaveBeenCalledOnce(); });',
      errors: [{ messageId: "callCountOnly" }],
    },
    {
      code: 'it("calls", () => { expect(send).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledTimes(2); });',
      errors: [{ messageId: "callCountOnly" }],
    },
    {
      code: 'import { test as verify } from "vitest"; verify.only("calls", () => { expect(send).toHaveBeenCalled(); });',
      errors: [{ messageId: "callCountOnly" }],
    },
    {
      code: 'test.each([1, 2])("calls", () => { expect(send).toHaveBeenCalled(); });',
      errors: [{ messageId: "callCountOnly" }],
    },
    {
      code: 'import * as vitest from "vitest"; vitest.test("calls", () => { vitest.expect(send).toHaveBeenCalled(); });',
      errors: [{ messageId: "callCountOnly" }],
    },
  ],
});
