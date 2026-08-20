import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

type PreferOptionsRule = TSESLint.RuleModule<
  "preferOptions",
  [{ allowFunctionNames?: string[] }]
>;

function assertPreferOptionsRule(
  candidateRule: TSESLint.RuleModule<string>,
): asserts candidateRule is TSESLint.RuleModule<string> & PreferOptionsRule {
  if (!("preferOptions" in candidateRule.meta.messages)) {
    throw new Error(
      "Options parameter rule has an unexpected message contract",
    );
  }
}

const rule = plugin.rules["prefer-options-parameter"];
if (rule === undefined) {
  throw new Error("Options parameter rule is missing from the registry");
}

assertPreferOptionsRule(rule);

const ruleTester = new RuleTester();
ruleTester.run("prefer-options-parameter", rule, {
  valid: [
    "function load(options: LoadOptions) {}",
    "function load(first: string, second: string) {}",
    "function load(this: Owner, first: string, second: string) {}",
    "items.map((item, index, items) => item);",
    "const owner = { [methodName](first: string, second: string, third: string) {} };",
    {
      code: "function protocol(first: string, second: string, third: string) {}",
      options: [{ allowFunctionNames: ["protocol"] }],
    },
    {
      code: "const owner = { load(first: string, second: string, third: string) {} };",
      options: [{ allowFunctionNames: ["load"] }],
    },
  ],
  invalid: [
    {
      code: "function load(first: string, second: string, third: string) {}",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "load", parameterCount: 3 },
        },
      ],
    },
    {
      code: "const load = (first: string, second: string, third: string) => {};",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "const load = function (first: string, second: string, ...rest: string[]) {};",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "const owner = { load(first: string, second: string, third: string) {} };",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "load", parameterCount: 3 },
        },
      ],
    },
    {
      code: "class Owner { load(first: string, second: string, third: string) {} }",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "class Owner { #load = (first: string, second: string, third: string) => {}; }",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "#load", parameterCount: 3 },
        },
      ],
    },
  ],
});
