import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"preferSwitch">(
  "prefer-switch-discriminator-chain",
  "preferSwitch",
);

const ruleTester = new RuleTester();
ruleTester.run("prefer-switch-discriminator-chain", rule, {
  valid: [
    'if (kind === "a") one(); else if (kind === "b") two(); else if (kind === "c") three();',
    'if (kind === "a") one(); else if (other === "b") two(); else if (kind === "c") three(); else if (kind === "d") four();',
    "if (score < 1) one(); else if (score < 2) two(); else if (score < 3) three(); else if (score < 4) four();",
    'if (kind == "a") one(); else if (kind == "b") two(); else if (kind == "c") three(); else if (kind == "d") four();',
    "if (kind === first) one(); else if (kind === second) two(); else if (kind === third) three(); else if (kind === fourth) four();",
    'if (kind === "a" && ready) one(); else if (kind === "b") two(); else if (kind === "c") three(); else if (kind === "d") four();',
    'if (input.kind === "a") one(); else if (input.kind === "b") two(); else if (input.kind === "c") three(); else if (input.kind === "d") four();',
  ],
  invalid: [
    {
      code: 'if (kind === "a") one(); else if (kind === "b") two(); else if (kind === "c") three(); else if (kind === "d") four();',
      errors: [{ messageId: "preferSwitch", data: { branchCount: 4 } }],
    },
    {
      code: 'if ("a" === kind) one(); else if ("b" === kind) two(); else if ("c" === kind) three(); else if ("d" === kind) four(); else fallback();',
      errors: [{ messageId: "preferSwitch", data: { branchCount: 4 } }],
    },
  ],
});
