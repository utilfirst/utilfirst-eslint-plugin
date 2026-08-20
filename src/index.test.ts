import { TSESLint } from "@typescript-eslint/utils";
import { expect, test } from "vitest";
import plugin from "./index.ts";

test("enables every exported rule in the recommended config", () => {
  const recommendedRules = plugin.configs.recommended.rules;
  expect(recommendedRules).toMatchObject({
    "@typescript-eslint/no-shadow": "error",
    "no-else-return": "error",
    "no-nested-ternary": "error",
    "no-shadow": "off",
  });

  for (const ruleName of Object.keys(plugin.rules)) {
    expect(recommendedRules?.[`utilfirst/${ruleName}`]).toBe("error");
  }
});

test("reports shadowed bindings through the recommended config", () => {
  const linter = new TSESLint.Linter();

  const messages = linter.verify(
    "const value = 1; function read() { const value = 2; return value; }",
    [plugin.configs.recommended],
  );

  expect(messages).toEqual([
    expect.objectContaining({ ruleId: "@typescript-eslint/no-shadow" }),
  ]);
});
