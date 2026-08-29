import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"unknownReturn">(
  "no-unknown-returns",
  "unknownReturn",
);

const ruleTester = new RuleTester();
ruleTester.run("no-unknown-returns", rule, {
  valid: [
    "function load(): User { return user; }",
    "function infer() { return input; }",
    "function cause(): { cause: unknown } { return { cause: input }; }",
    "function outer<Raw>() { function load(): Raw { return input; } }",
    "type Raw = unknown; function outer<Raw>() { function load(): Raw { return input; } }",
    "type Promise<Value> = { value: Value }; function load(): Promise<unknown> { return result; }",
    'import type { Promise } from "./promise"; function load(): Promise<unknown> { return result; }',
    "type Key = unknown; type Mapped<Input> = { [Key in keyof Input]: () => Key };",
    "type Item = unknown; type Unpacked<Input> = Input extends Promise<infer Item> ? () => Item : never;",
  ],
  invalid: [
    {
      code: "function load(): unknown { return input; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "function load(): Promise<unknown> { return promise; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "type Raw = unknown; function load(): Raw { return input; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "function outer() { type Raw = unknown; function load(): Raw { return input; } }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "const load = (): unknown => input;",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "type Loader = () => unknown;",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "interface Loader { load(): unknown }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "declare function load(): unknown;",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "function load(): string | unknown { return input; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "type Identity<T> = T; function load(): Identity<unknown> { return input; }",
      errors: [{ messageId: "unknownReturn" }],
    },
    {
      code: "type Identity<T> = T; function load(): Promise<Identity<unknown>> { return promise; }",
      errors: [{ messageId: "unknownReturn" }],
    },
  ],
});
