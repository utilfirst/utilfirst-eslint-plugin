import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"anonymousDefaultExport" | "topLevelBinding">(
  "prefer-top-level-function-declarations",
  "anonymousDefaultExport",
  "topLevelBinding",
);

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
