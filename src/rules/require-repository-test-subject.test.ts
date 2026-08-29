import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"missingSubject">(
  "require-repository-test-subject",
  "missingSubject",
);

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { sourceType: "module" } },
});

ruleTester.run("require-repository-test-subject", rule, {
  valid: [
    'import { run } from "./run.ts"; test("runs", () => run());',
    'import value from "#internal/value.ts"; it("reads", () => value);',
    'import { exports } from "cloudflare:workers"; test("worker", () => exports.default);',
    'test("dynamic", async () => { await import("./subject.ts"); });',
    'import { test } from "vitest"; export const fixture = 1;',
  ],
  invalid: [
    {
      code: 'import { test, expect } from "vitest"; test("array", () => expect([1].at(0)).toBe(1));',
      errors: [{ messageId: "missingSubject" }],
    },
    {
      code: 'import { test as verify } from "vitest"; verify.each([1, 2])("array", () => {});',
      errors: [{ messageId: "missingSubject" }],
    },
  ],
});
