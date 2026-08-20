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
  "no-unsafe-dictionary-type"
] as TSESLint.RuleModule<"unsafeDictionary">;

const ruleTester = new RuleTester();
ruleTester.run("no-unsafe-dictionary-type", rule, {
  valid: [
    "type Commands = Record<string, Command>;",
    "type Metadata = Record<PropertyKey, JsonValue>;",
    "type Allowed = Record<string, { payload: unknown }>;",
    "type Values = Map<string, unknown>;",
  ],
  invalid: [
    {
      code: "type Metadata = Record<string, unknown>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "type Metadata = { [key: string]: any };",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "type Metadata = Record<string, object>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "type Metadata = Record<string, {}>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
  ],
});
