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
  "no-unknown-type-aliases"
] as TSESLint.RuleModule<"unknownAlias">;

const ruleTester = new RuleTester();
ruleTester.run("no-unknown-type-aliases", rule, {
  valid: [
    "type Payload = unknown[];",
    "type Payload = { value: unknown };",
    "type Identity<T> = T; type Payload = Identity<unknown>;",
    "type Left = Right; type Right = Left;",
  ],
  invalid: [
    {
      code: "type Payload = unknown;",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "type Raw = unknown; type Payload = Raw;",
      errors: [
        { messageId: "unknownAlias", data: { alias: "Raw" } },
        { messageId: "unknownAlias", data: { alias: "Payload" } },
      ],
    },
    {
      code: "export type Payload = (unknown);",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
  ],
});
