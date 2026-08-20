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
    "import { Record } from './local'; type Metadata = Record<string, unknown>;",
    "type Record<Key, Value> = { key: Key; value: Value }; type Metadata = Record<string, unknown>;",
    "interface Owner { readonly id: string } type Metadata = Record<string, unknown & Owner>;",
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
    {
      code: "type Metadata = Readonly<Partial<Required<Record<string, unknown>>>>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "type Index<Value> = Record<string, Value>; type Metadata = Index<unknown>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "interface Empty {} type Metadata = Record<string, Empty>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
  ],
});
