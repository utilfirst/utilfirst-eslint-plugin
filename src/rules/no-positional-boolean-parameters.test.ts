import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<
  "positionalBoolean",
  [{ allowFunctionNames?: string[] }]
>("no-positional-boolean-parameters", "positionalBoolean");

const ruleTester = new RuleTester();
ruleTester.run("no-positional-boolean-parameters", rule, {
  valid: [
    "function load(options: { isFresh: boolean }) {}",
    "items.filter((item, isSelected: boolean) => isSelected);",
    "type Mapper = (callback: (isSelected: boolean) => void) => void;",
    "const owner = { [methodName](isFresh: boolean) {} };",
    {
      code: "function protocol(isFresh: boolean) {}",
      options: [{ allowFunctionNames: ["protocol"] }],
    },
    {
      code: "const owner = { load(isFresh: boolean) {} };",
      options: [{ allowFunctionNames: ["load"] }],
    },
  ],
  invalid: [
    {
      code: "function load(isFresh: boolean) {}",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "load", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "const load = (isFresh: boolean) => {};",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "const load = function (isFresh: boolean = false) {};",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "const owner = { load(isFresh: boolean) {} };",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "load", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "class Owner { load(isFresh: boolean) {} }",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "class Owner { constructor(private isEnabled: boolean) {} }",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "constructor", parameter: "isEnabled" },
        },
      ],
    },
    {
      code: "class Owner { #load = (isFresh: boolean) => {}; }",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "#load", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "type Flag = boolean; function load(isFresh: Flag) {}",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "type Flag = true | false; function load(isFresh: Flag) {}",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "declare function load(isFresh: boolean): void;",
      errors: [{ messageId: "positionalBoolean" }],
    },
    {
      code: "interface Owner { load(isFresh: boolean): void }",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "load", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "type Loader = (isFresh: boolean) => void;",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "Loader", parameter: "isFresh" },
        },
      ],
    },
    {
      code: "interface Owner { load: (isFresh: boolean) => void }",
      errors: [
        {
          messageId: "positionalBoolean",
          data: { functionName: "load", parameter: "isFresh" },
        },
      ],
    },
  ],
});
