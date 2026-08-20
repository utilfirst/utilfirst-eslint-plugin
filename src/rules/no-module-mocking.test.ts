import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

type ModuleMockRule = TSESLint.RuleModule<
  "moduleMock",
  [{ internalModulePrefixes?: string[] }]
>;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

function assertModuleMockRule(
  candidateRule: TSESLint.RuleModule<string>,
): asserts candidateRule is TSESLint.RuleModule<string> & ModuleMockRule {
  if (!("moduleMock" in candidateRule.meta.messages)) {
    throw new Error("Module mock rule has an unexpected message contract");
  }
}

const rule = plugin.rules["no-module-mocking"];
if (rule === undefined) {
  throw new Error("Module mock rule is missing from the registry");
}

assertModuleMockRule(rule);

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
      code: 'vi.mock("@workspace/local-package");',
      options: [{ internalModulePrefixes: ["@workspace/"] }],
      errors: [{ messageId: "moduleMock" }],
    },
  ],
});
