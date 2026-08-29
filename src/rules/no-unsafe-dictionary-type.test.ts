import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"unsafeDictionary">(
  "no-unsafe-dictionary-type",
  "unsafeDictionary",
);

const ruleTester = new RuleTester();
ruleTester.run("no-unsafe-dictionary-type", rule, {
  valid: [
    "type Commands = Record<string, Command>;",
    "type Metadata = Record<PropertyKey, JsonValue>;",
    "type Allowed = Record<string, { payload: unknown }>;",
    "type Values = Map<string, Command>;",
    "import { Map } from './local'; type Values = Map<string, unknown>;",
    "class Map<Key, Value> {} type Values = Map<string, unknown>;",
    "function outer() { class Map<Key, Value> {} type Values = Map<string, unknown>; }",
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
    {
      code: "type Values = Map<string, unknown>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "type Values = ReadonlyMap<string, object>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "type Values = WeakMap<object, any>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "function outer() { type Index<Value> = Record<string, Value>; type Values = Index<unknown>; }",
      errors: [{ messageId: "unsafeDictionary" }],
    },
    {
      code: "function outer() { type Raw = Record<string, unknown>; let values: Raw; }",
      errors: [{ messageId: "unsafeDictionary" }],
    },
  ],
});
