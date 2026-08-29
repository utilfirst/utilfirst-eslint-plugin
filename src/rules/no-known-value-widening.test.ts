import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"widening">("no-known-value-widening", "widening");

const ruleTester = new RuleTester();
ruleTester.run("no-known-value-widening", rule, {
  valid: [
    "const value: unknown = read();",
    "const handlers: Record<string, Handler> = {};",
    "const handlers: Record<string, Handler> = { start };",
    "const handlers = { start } satisfies Record<string, Handler>;",
    "type Handlers = { start: Handler }; const handlers: Handlers = { start };",
    "const value = ({} as unknown)! as string;",
  ],
  invalid: [
    {
      code: "const value: unknown = {};",
      errors: [{ messageId: "widening" }],
    },
    {
      code: "const value: object = { id: 1 };",
      errors: [{ messageId: "widening" }],
    },
    {
      code: "function create(): unknown { return {}; }",
      errors: [{ messageId: "widening" }],
    },
    {
      code: "const value: any = { id: 1 };",
      errors: [{ messageId: "widening" }],
    },
    {
      code: "type Identity<Value> = Value; const value: Identity<any> = { id: 1 };",
      errors: [{ messageId: "widening" }],
    },
  ],
});
