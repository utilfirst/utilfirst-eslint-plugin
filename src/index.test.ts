import { expect, test } from "vitest";
import plugin from "./index.ts";

test("enables every exported rule in the recommended config", () => {
  const expectedRules = Object.fromEntries(
    Object.keys(plugin.rules).map((ruleName) => [
      `utilfirst/${ruleName}`,
      "error",
    ]),
  );

  expect(plugin.configs.recommended.rules).toStrictEqual(expectedRules);
});
