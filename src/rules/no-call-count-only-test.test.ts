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
    'import assert from "node:assert/strict"; test("effect", () => { assert.equal(store.value, "ready"); expect(send).toHaveBeenCalledOnce(); });',
    'import { equal as verifyEqual } from "node:assert/strict"; test("effect", () => { verifyEqual(store.value, "ready"); expect(send).toHaveBeenCalledOnce(); });',
    'test("effect", () => { function verify() { expect(store.value).toBe("ready"); } verify(); expect(send).toHaveBeenCalledOnce(); });',
    'function verify() { expect(store.value).toBe("ready"); } test("effect", function runTest() { verify(); expect(send).toHaveBeenCalledOnce(); });',
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
    {
      code: 'import test from "node:test"; test("calls", () => { expect(send).toHaveBeenCalled(); });',
      errors: [{ messageId: "callCountOnly" }],
    },
    {
      code: 'function runTest() { expect(send).toHaveBeenCalled(); } test("calls", runTest);',
      errors: [{ messageId: "callCountOnly" }],
    },
    {
      code: 'test("calls", () => { function unused() { expect(store.value).toBe("ready"); } run(); expect(send).toHaveBeenCalledOnce(); });',
      errors: [{ messageId: "callCountOnly" }],
    },
  ],
});
