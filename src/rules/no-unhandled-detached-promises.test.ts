import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";
import plugin from "../index.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const rule = plugin.rules["no-unhandled-detached-promises"];
if (rule === undefined) {
  throw new Error("Detached promise rule is missing from the registry");
}

const ruleTester = new RuleTester();
ruleTester.run("no-unhandled-detached-promises", rule, {
  valid: [
    "void send().catch(handleError);",
    "void send().then(handleValue, handleError);",
    "void send().catch(handleError).finally(cleanup);",
    "void 0;",
    "await send();",
    "return send();",
  ],
  invalid: [
    {
      code: "void send();",
      errors: [{ messageId: "unhandledDetachedPromise" }],
    },
    {
      code: "void runSynchronously();",
      errors: [{ messageId: "unhandledDetachedPromise" }],
    },
    {
      code: "void send().then(handleValue);",
      errors: [{ messageId: "unhandledDetachedPromise" }],
    },
    {
      code: "void send().catch();",
      errors: [{ messageId: "unhandledDetachedPromise" }],
    },
    {
      code: "void send().then(handleValue, undefined);",
      errors: [{ messageId: "unhandledDetachedPromise" }],
    },
    {
      code: "void (send() as Promise<void>);",
      errors: [{ messageId: "unhandledDetachedPromise" }],
    },
  ],
});
