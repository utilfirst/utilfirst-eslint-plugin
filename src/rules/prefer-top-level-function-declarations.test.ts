import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// SAFETY: The registry key selects the rule whose message IDs this test asserts.
const rule = plugin.rules[
  "prefer-top-level-function-declarations"
] as TSESLint.RuleModule<"anonymousDefaultExport" | "topLevelBinding">;

const ruleTester = new RuleTester();
ruleTester.run("prefer-top-level-function-declarations", rule, {
  valid: [
    "function load() {}",
    "export function load() {}",
    "export default function load() {}",
    "function outer() { const load = () => {}; return load; }",
    "items.map((item) => item.id);",
    "const Component = memo(() => null);",
    "const owner = { load() {} };",
    "declare const load: () => void;",
  ],
  invalid: [
    {
      code: "const load = () => {};",
      errors: [
        {
          messageId: "topLevelBinding",
          data: { functionName: "load" },
        },
      ],
    },
    {
      code: "export const load = async function named() {};",
      errors: [
        {
          messageId: "topLevelBinding",
          data: { functionName: "load" },
        },
      ],
    },
    {
      code: "const load = (() => {}) satisfies (() => void);",
      errors: [
        {
          messageId: "topLevelBinding",
          data: { functionName: "load" },
        },
      ],
    },
    {
      code: "export default () => null;",
      errors: [{ messageId: "anonymousDefaultExport" }],
    },
    {
      code: "export default function () {}",
      errors: [{ messageId: "anonymousDefaultExport" }],
    },
    {
      code: "export default (() => null) satisfies (() => null);",
      errors: [{ messageId: "anonymousDefaultExport" }],
    },
    {
      code: "export default (function () {}) as (() => void);",
      errors: [{ messageId: "anonymousDefaultExport" }],
    },
  ],
});
