import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "../index.ts";

type RuntimeTypeofRule = TSESLint.RuleModule<
  "runtimeTypeof",
  [{ allowInTypeGuards?: boolean }]
>;

function assertRuntimeTypeofRule(
  candidateRule: TSESLint.RuleModule<string>,
): asserts candidateRule is TSESLint.RuleModule<string> & RuntimeTypeofRule {
  if (!("runtimeTypeof" in candidateRule.meta.messages)) {
    throw new Error("Runtime typeof rule has an unexpected message contract");
  }
}

const rule = plugin.rules["no-runtime-typeof"];
if (rule === undefined) {
  throw new Error("Runtime typeof rule is missing from the registry");
}

assertRuntimeTypeofRule(rule);

const ruleTester = new RuleTester();
ruleTester.run("no-runtime-typeof", rule, {
  valid: [
    "const value = input;",
    'function parse(value: unknown): string { if (typeof value !== "string") throw new Error(); return value; }',
    {
      code: 'function isString(value: unknown): value is string { return typeof value === "string"; }',
      options: [{ allowInTypeGuards: true }],
    },
    {
      code: 'const isString = (value: unknown): value is string => typeof value === "string";',
      options: [{ allowInTypeGuards: true }],
    },
    {
      code: 'function assertString(value: unknown): asserts value is string { if (typeof value !== "string") throw new Error(); }',
      options: [{ allowInTypeGuards: true }],
    },
  ],
  invalid: [
    {
      code: 'if (typeof input === "string") use(input);',
      errors: [{ messageId: "runtimeTypeof" }],
    },
    {
      code: 'function isString(value: unknown): value is string { const check = () => typeof value === "string"; return check(); }',
      options: [{ allowInTypeGuards: true }],
      errors: [{ messageId: "runtimeTypeof" }],
    },
  ],
});
