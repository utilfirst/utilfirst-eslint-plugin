import { expect, test } from "vitest";

import plugin from "./index.ts";
import { oxlintBaseConfig } from "./oxlint.ts";

test("enables every custom rule in the Oxlint base config", () => {
  const expectedRules = Object.fromEntries(
    Object.keys(plugin.rules).map((ruleName) => [
      `utilfirst/${ruleName}`,
      "error",
    ]),
  );

  expect(oxlintBaseConfig.rules).toMatchObject(expectedRules);
});
