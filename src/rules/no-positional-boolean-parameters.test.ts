import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

type PositionalBooleanRule = TSESLint.RuleModule<
  "positionalBoolean",
  [{ allowFunctionNames?: string[] }]
>;

function assertPositionalBooleanRule(
  candidateRule: TSESLint.RuleModule<string>,
): asserts candidateRule is TSESLint.RuleModule<string> &
  PositionalBooleanRule {
  if (!("positionalBoolean" in candidateRule.meta.messages)) {
    throw new Error(
      "Positional boolean rule has an unexpected message contract",
    );
  }
}

const rule = plugin.rules["no-positional-boolean-parameters"];
if (rule === undefined) {
  throw new Error("Positional boolean rule is missing from the registry");
}

assertPositionalBooleanRule(rule);

const ruleTester = new RuleTester();
ruleTester.run("no-positional-boolean-parameters", rule, {
  valid: [
    "function load(options: { isFresh: boolean }) {}",
    "items.filter((item, isSelected: boolean) => isSelected);",
    "const owner = { [methodName](isFresh: boolean) {} };",
    {
      code: "function protocol(isFresh: boolean) {}",
      options: [{ allowFunctionNames: ["protocol"] }],
    },
    {
      code: "const owner = { load(isFresh: boolean) {} };",
      options: [{ allowFunctionNames: ["load"] }],
    },
  ],
  invalid: [
    {
      code: "function load(isFresh: boolean) {}",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "load", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "const load = (isFresh: boolean) => {};",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "const load = function (isFresh: boolean = false) {};",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "const owner = { load(isFresh: boolean) {} };",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "load", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "class Owner { load(isFresh: boolean) {} }",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "class Owner { constructor(private isEnabled: boolean) {} }",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "constructor", parameter: "isEnabled" },
        },
      ],
    },
    {
      code: "class Owner { #load = (isFresh: boolean) => {}; }",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "#load", parameter: "isFresh" },
        },
      ],
    },
  ],
});
