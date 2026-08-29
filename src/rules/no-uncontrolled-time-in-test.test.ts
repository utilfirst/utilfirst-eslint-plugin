import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"uncontrolledTime">(
  "no-uncontrolled-time-in-test",
  "uncontrolledTime",
);

const ruleTester = new RuleTester();
ruleTester.run("no-uncontrolled-time-in-test", rule, {
  valid: [
    "export function currentTime() { return Date.now(); }",
    'test("time", () => { vi.setSystemTime(1000); expect(Date.now()).toBe(1000); });',
    'test("time", () => { jest.useFakeTimers({ now: 1000 }); expect(new Date()).toEqual(new Date(1000)); });',
    'import { vi as clock } from "vitest"; test("time", () => { clock.setSystemTime(1000); expect(Date.now()).toBe(1000); });',
    'import * as vitest from "vitest"; test("time", () => { vitest.vi.setSystemTime(1000); expect(Date.now()).toBe(1000); });',
    'beforeEach(() => { vi.setSystemTime(1000); }); test("time", () => { expect(Date.now()).toBe(1000); });',
    'describe("controlled", () => { beforeEach(() => { vi.setSystemTime(1000); }); test("time", () => { expect(Date.now()).toBe(1000); }); }); test("plain", () => { expect(1).toBe(1); });',
    'test("first", () => { vi.setSystemTime(1000); expect(Date.now()).toBe(1000); }); test("second", () => { vi.setSystemTime(2000); expect(Date.now()).toBe(2000); });',
    'const Date = { now: () => 1000 }; test("time", () => { expect(Date.now()).toBe(1000); });',
    'function Date() { return "fixed"; } test("time", () => { expect(Date()).toBe("fixed"); });',
    'class Date { constructor() {} } test("time", () => { expect(new Date()).toBeInstanceOf(Date); });',
  ],
  invalid: [
    {
      code: 'test("time", () => { expect(Date.now()).toBeGreaterThan(0); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'beforeEach(() => { startedAt = new Date(); }); test("starts", () => { expect(startedAt).toBeDefined(); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'import { test as verify } from "vitest"; const startedAt = Date.now(); verify("starts", () => { expect(startedAt).toBeGreaterThan(0); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'clock.setSystemTime(1000); test("time", () => { expect(Date.now()).toBe(1000); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'test("controlled", () => { vi.setSystemTime(1000); expect(Date.now()).toBe(1000); }); test("uncontrolled", () => { expect(Date.now()).toBeGreaterThan(0); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'test("time", () => { const startedAt = Date.now(); vi.setSystemTime(1000); expect(startedAt).toBeGreaterThan(0); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'describe("controlled", () => { beforeEach(() => { vi.setSystemTime(1000); }); test("time", () => { expect(Date.now()).toBe(1000); }); }); test("uncontrolled", () => { expect(Date.now()).toBeGreaterThan(0); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'afterEach(() => { vi.setSystemTime(1000); }); test("uncontrolled", () => { expect(Date.now()).toBeGreaterThan(0); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
    {
      code: 'test("time", () => { expect(Date()).toContain("GMT"); });',
      errors: [{ messageId: "uncontrolledTime" }],
    },
  ],
});
