import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<
  "preferOptions",
  [{ allowFunctionNames?: string[] }]
>("prefer-options-parameter", "preferOptions");

const ruleTester = new RuleTester();
ruleTester.run("prefer-options-parameter", rule, {
  valid: [
    "function load(options: LoadOptions) {}",
    "function load(first: string, second: string) {}",
    "function load(this: Owner, first: string, second: string) {}",
    "items.map((item, index, items) => item);",
    "type Mapper = (callback: (item: string, index: number, items: string[]) => void) => void;",
    "const owner = { [methodName](first: string, second: string, third: string) {} };",
    {
      code: "function protocol(first: string, second: string, third: string) {}",
      options: [{ allowFunctionNames: ["protocol"] }],
    },
    {
      code: "const owner = { load(first: string, second: string, third: string) {} };",
      options: [{ allowFunctionNames: ["load"] }],
    },
  ],
  invalid: [
    {
      code: "function load(first: string, second: string, third: string) {}",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "load", parameterCount: 3 },
        },
      ],
    },
    {
      code: "const load = (first: string, second: string, third: string) => {};",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "const load = function (first: string, second: string, ...rest: string[]) {};",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "const owner = { load(first: string, second: string, third: string) {} };",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "load", parameterCount: 3 },
        },
      ],
    },
    {
      code: "class Owner { load(first: string, second: string, third: string) {} }",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "class Owner { #load = (first: string, second: string, third: string) => {}; }",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "#load", parameterCount: 3 },
        },
      ],
    },
    {
      code: "declare function load(first: string, second: string, third: string): void;",
      errors: [{ messageId: "preferOptions" }],
    },
    {
      code: "interface Owner { load(first: string, second: string, third: string): void }",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "load", parameterCount: 3 },
        },
      ],
    },
    {
      code: "type Loader = (first: string, second: string, third: string) => void;",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "Loader", parameterCount: 3 },
        },
      ],
    },
    {
      code: "interface Loader { (first: string, second: string, third: string): void }",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "Loader", parameterCount: 3 },
        },
      ],
    },
    {
      code: "interface Factory { new (first: string, second: string, third: string): Owner }",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "Factory", parameterCount: 3 },
        },
      ],
    },
    {
      code: "interface Owner { load: (first: string, second: string, third: string) => void }",
      errors: [
        {
          messageId: "preferOptions",
          data: { functionName: "load", parameterCount: 3 },
        },
      ],
    },
  ],
});
