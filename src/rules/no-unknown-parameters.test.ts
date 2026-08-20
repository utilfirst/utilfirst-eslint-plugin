import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

type UnknownParametersRule = TSESLint.RuleModule<
  "unknownParameter",
  [{ allowParameterNames?: string[] }]
>;

// SAFETY: The registry key selects the rule whose message and option contract this test asserts.
const rule = plugin.rules[
  "no-unknown-parameters"
] as TSESLint.RuleModule<"unknownParameter"> & UnknownParametersRule;

const ruleTester = new RuleTester();
ruleTester.run("no-unknown-parameters", rule, {
  valid: [
    "function enrich(cause: unknown) {}",
    "function consume<Value>(value: Value) {}",
    "function consume(value: { id: string }) {}",
    "function parse(value: unknown): string { return String(value); }",
    "function isString(value: unknown): value is string { return true; }",
    "type Parser = (value: unknown) => string;",
    {
      code: "type ExternalCallback = (payload: unknown) => void;",
      options: [{ allowParameterNames: ["payload"] }],
    },
  ],
  invalid: [
    {
      code: "function consume(value: unknown) {}",
      errors: [{ messageId: "unknownParameter" }],
    },
    {
      code: "type Consumer = (value: unknown) => void;",
      errors: [{ messageId: "unknownParameter" }],
    },
    {
      code: "function consume(...values: unknown[]) {}",
      errors: [{ messageId: "unknownParameter" }],
    },
  ],
});
