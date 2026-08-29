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
    'import { LIMIT } from "./config"; expect(3).not.toBe(LIMIT);',
    'import { LIMIT } from "./config"; expect(run(LIMIT)).toBe("limited");',
    'import { LIMIT } from "./config"; expect(LIMIT).toBe(getExpectedLimit());',
    'import assert from "node:assert/strict"; import { PROFILE } from "./config"; assert.equal(run(PROFILE), 48);',
    'import assert from "node:assert/strict"; import { PROFILE } from "./config"; assert.equal(run(), PROFILE.durationFrames);',
    'import assert from "node:assert/strict"; import { PROFILE } from "./config"; assert.equal(PROFILE[key], 48);',
    'import { equal } from "./assert"; import { PROFILE } from "./config"; equal(PROFILE.durationFrames, 48);',
    'import assert from "node:assert/strict"; import { PROFILE } from "./config"; function verify() { const assert = localAssert; assert.equal(PROFILE.durationFrames, 48); }',
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
    {
      code: 'import { PROFILE } from "./config"; expect(PROFILE.durationFrames).toBe(48);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import { LIMIT } from "./config"; expect(3).toBe(LIMIT);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import assert from "node:assert/strict"; import { PROFILE } from "./config"; assert.equal(PROFILE.durationFrames, 48);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import assert from "node:assert/strict"; import { PROFILE } from "./config"; assert.equal(48, PROFILE.durationFrames);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import * as strictAssert from "node:assert"; import { PROFILE } from "./config"; strictAssert.deepStrictEqual(PROFILE.labels, ["a", "b"]);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import { strictEqual as equal } from "node:assert/strict"; import { PROFILE } from "./config"; equal(PROFILE.durationFrames, 48);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import assert from "node:assert"; import { PROFILE } from "./config"; assert.strict.equal(PROFILE.durationFrames, 48);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
    {
      code: 'import { strict as assert } from "node:assert"; import { PROFILE } from "./config"; assert.equal(PROFILE.durationFrames, 48);',
      errors: [{ messageId: "importedConstantRestatement" }],
    },
  ],
});
