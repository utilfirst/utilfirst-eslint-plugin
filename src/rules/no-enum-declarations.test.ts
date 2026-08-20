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
  "no-enum-declarations"
] as TSESLint.RuleModule<"enumDeclaration">;

const ruleTester = new RuleTester();
ruleTester.run("no-enum-declarations", rule, {
  valid: [
    "const enum Status { Ready, Done }",
    "declare enum Status { Ready, Done }",
    "declare namespace Protocol { enum Status { Ready, Done } }",
    'declare module "protocol" { enum Status { Ready, Done } }',
    {
      code: "enum Status { Ready, Done }",
      filename: "types.d.ts",
    },
    'const Status = { ready: "ready", done: "done" } as const;',
    'type Status = "ready" | "done";',
  ],
  invalid: [
    {
      code: "enum Status { Ready, Done }",
      errors: [{ messageId: "enumDeclaration" }],
    },
    {
      code: "export enum Status { Ready, Done }",
      errors: [{ messageId: "enumDeclaration" }],
    },
  ],
});
