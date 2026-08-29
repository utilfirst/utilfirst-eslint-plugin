import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"snapshot">("no-test-snapshots", "snapshot");

const ruleTester = new RuleTester();
ruleTester.run("no-test-snapshots", rule, {
  valid: [
    "expect(value).toEqual({ status: 'ready' });",
    "object.toMatchSnapshot();",
    "const expect = () => object; expect().toMatchSnapshot();",
  ],
  invalid: [
    {
      code: "expect(value).toMatchSnapshot();",
      errors: [{ messageId: "snapshot" }],
    },
    {
      code: "expect(value)['toMatchInlineSnapshot']('ready');",
      errors: [{ messageId: "snapshot" }],
    },
    {
      code: "expect(run).toThrowErrorMatchingSnapshot();",
      errors: [{ messageId: "snapshot" }],
    },
    {
      code: 'import { expect as verify } from "vitest"; verify(value).toMatchSnapshot();',
      errors: [{ messageId: "snapshot" }],
    },
    {
      code: "expect.addSnapshotSerializer(serializer);",
      errors: [{ messageId: "snapshot" }],
    },
  ],
});
