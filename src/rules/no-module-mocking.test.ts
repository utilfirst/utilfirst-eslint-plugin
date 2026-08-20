import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-module-mocking"
] as TSESLint.RuleModule<"moduleMock">;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { sourceType: "module" },
  },
});

ruleTester.run("no-module-mocking", rule, {
  valid: [
    "const value = 1;",
    "vi.fn();",
    "jest.spyOn(target, 'method');",
    "const vi = { mock() {} }; vi.mock();",
    "const jest = { doMock() {} }; jest.doMock();",
    'vi.mock("node:fs");',
    'jest.mock("external-package");',
    "vi.mock(moduleName);",
  ],
  invalid: [
    {
      code: 'import { vi } from "vitest"; vi.mock("./dependency");',
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: 'import { vi as testApi } from "vitest"; testApi.doMock("./dependency");',
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: 'jest["unstable_mockModule"]("./dependency");',
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: 'vi.mock("#internal/dependency");',
      errors: [{ messageId: "moduleMock" }],
    },
  ],
});
