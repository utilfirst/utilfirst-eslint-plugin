import { expect, test } from "vitest";
import plugin from "./index.ts";

test("enables every exported rule in the recommended config", () => {
  const recommendedRules = plugin.configs.recommended.rules;
  expect(recommendedRules).toMatchObject({
    "no-else-return": "error",
    "no-nested-ternary": "error",
  });

  for (const ruleName of Object.keys(plugin.rules)) {
    expect(recommendedRules?.[`utilfirst/${ruleName}`]).toBe("error");
  }
});
