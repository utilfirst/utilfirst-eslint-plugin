import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"enumDeclaration">(
  "no-enum-declarations",
  "enumDeclaration",
);

const ruleTester = new RuleTester();
ruleTester.run("no-enum-declarations", rule, {
  valid: [
    "declare enum Status { Ready, Done }",
    "declare namespace Protocol { enum Status { Ready, Done } }",
    'declare module "protocol" { enum Status { Ready, Done } }',
    {
      code: "enum Status { Ready, Done }",
      filename: "types.d.ts",
    },
    {
      code: "enum Status { Ready, Done }",
      filename: "types.d.mts",
    },
    {
      code: "enum Status { Ready, Done }",
      filename: "types.d.cts",
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
    {
      code: "const enum Status { Ready, Done }",
      errors: [{ messageId: "enumDeclaration" }],
    },
  ],
});
