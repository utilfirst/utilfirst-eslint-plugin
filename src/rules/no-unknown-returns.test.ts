import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

// SAFETY: The registry key selects the rule whose message ID this test asserts.
const rule = plugin.rules[
  "no-unknown-returns"
] as TSESLint.RuleModule<"unknownReturn">;

const ruleTester = new RuleTester();
ruleTester.run("no-unknown-returns", rule, {
  valid: [
    "function load(): User { return user; }",
    "function infer() { return input; }",
    "function cause(): { cause: unknown } { return { cause: input }; }",
    "function outer<Raw>() { function load(): Raw { return input; } }",
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
  ],
});
