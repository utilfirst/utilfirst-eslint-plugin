import { RuleTester } from "@typescript-eslint/rule-tester";
import plugin from "../index.ts";

const rule = plugin.rules["require-lint-suppression-reason"];
if (rule === undefined) {
  throw new Error("Lint suppression reason rule is missing from the registry");
}

const ruleTester = new RuleTester({
  linterOptions: { reportUnusedDisableDirectives: false },
});

ruleTester.run("require-lint-suppression-reason", rule, {
  valid: [
    "// eslint-disable-next-line no-console -- The CLI owns this output.\nconsole.log('ready');",
    "/* oxlint-disable no-console -- The CLI owns this output. */\nconsole.log('ready');",
    "// A regular comment.",
    "// eslint-enable no-console",
  ],
  invalid: [
    {
      code: "// eslint-disable-next-line no-console\nconsole.log('ready');",
      errors: [{ messageId: "missingReason" }],
    },
    {
      code: "/* oxlint-disable no-console */\nconsole.log('ready');",
      errors: [{ messageId: "missingReason" }],
    },
  ],
});
