import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<
  "moduleMock",
  [{ internalModulePrefixes?: string[] }]
>("no-module-mocking", "moduleMock");

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
    'vi.mock(import("external-package"));',
    'vi.mock("@external/package");',
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
    {
      code: 'import { vi } from "vitest"; vi.mock(import("./dependency"));',
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: 'import * as vitest from "vitest"; vitest.vi.mock("./dependency");',
      errors: [{ messageId: "moduleMock" }],
    },
    {
      code: 'vi.mock("@workspace/local-package");',
      options: [{ internalModulePrefixes: ["@workspace/"] }],
      errors: [{ messageId: "moduleMock" }],
    },
  ],
});
