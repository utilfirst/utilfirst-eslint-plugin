import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<
  "forbiddenSymbolName",
  [{ allowSymbolNames?: string[] }]
>("no-shape-in-symbol-names", "forbiddenSymbolName");

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("no-shape-in-symbol-names", rule, {
  valid: [
    "const value = owner.shape;",
    'owner["shape"];',
    'const view = <Widget shape="round" />;',
    "const { shape: geometry } = payload;",
    "const { shape } = payload;",
    "import { shape as geometry } from './protocol';",
    "export { geometry as shape };",
    "const shapefile = value;",
    "const reshapedValue = value;",
    "const shapelessValue = value;",
    {
      code: "type Shape = Circle | Rectangle;",
      options: [{ allowSymbolNames: ["Shape"] }],
    },
  ],
  invalid: [
    {
      code: "const userShape = value;",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "type UserShape = { id: string };",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "type USER_SHAPE_MAP = { id: string };",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "const shape2D = value;",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "type ShapeResult = { area: number };",
      options: [{ allowSymbolNames: ["Shape"] }],
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: 'import { value as userShape } from "./protocol";',
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
    {
      code: "const userShape = value; export { userShape as value };",
      errors: [{ messageId: "forbiddenSymbolName" }],
    },
  ],
});
