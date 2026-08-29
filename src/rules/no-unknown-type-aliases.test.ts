import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"unknownAlias">(
  "no-unknown-type-aliases",
  "unknownAlias",
);

const ruleTester = new RuleTester();
ruleTester.run("no-unknown-type-aliases", rule, {
  valid: [
    "type Payload = unknown[];",
    "type Payload = { value: unknown };",
    "type Identity<T> = T;",
    "type Left = Right; type Right = Left;",
  ],
  invalid: [
    {
      code: "type Payload = unknown;",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "type Payload = string | unknown;",
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
      code: "type Raw = string | unknown; type Payload = Raw;",
      errors: [
        { messageId: "unknownAlias", data: { alias: "Raw" } },
        { messageId: "unknownAlias", data: { alias: "Payload" } },
      ],
    },
    {
      code: "export type Payload = (unknown);",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "function outer() { type Payload = unknown; return input; }",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "namespace Values { export type Payload = unknown; }",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "type Identity<T> = T; type Payload = Identity<unknown>;",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "type Identity<T> = T; type Wrapper<T> = Identity<T>; type Payload = Wrapper<unknown>;",
      errors: [{ messageId: "unknownAlias", data: { alias: "Payload" } }],
    },
    {
      code: "type T = unknown; type Identity<T> = T;",
      errors: [{ messageId: "unknownAlias", data: { alias: "T" } }],
    },
  ],
});
