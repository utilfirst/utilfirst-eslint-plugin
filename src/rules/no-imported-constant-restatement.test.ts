import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"importedConstantRestatement">(
  "no-imported-constant-restatement",
  "importedConstantRestatement",
);

const ruleTester = new RuleTester();
ruleTester.run("no-imported-constant-restatement", rule, {
  valid: [
    "const LIMIT = 3; expect(LIMIT).toBe(3);",
    'import { limit } from "./config"; expect(limit).toBe(3);',
    'import { LIMIT } from "./config"; expect(runWithLimit()).toBe(LIMIT);',
    'import { LIMIT } from "./config"; expect(run(LIMIT)).toBe("limited");',
    'import { LIMIT } from "./config"; expect(LIMIT).toBe(getExpectedLimit());',
    'import { LIMIT } from "./config"; const expect = () => object; expect(LIMIT).toBe(3);',
  ],
  invalid: [
    {
      code: 'import { LIMIT } from "./config"; expect(LIMIT).toBe(3);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import { RETRY_LIMIT as MAX_ATTEMPTS } from "./config"; expect(MAX_ATTEMPTS).toEqual(-1);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import { DEFAULTS } from "./config"; expect(DEFAULTS).toStrictEqual({ enabled: true, labels: ["a", "b"] });',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
  ],
});
