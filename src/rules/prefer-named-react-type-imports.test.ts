import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"namespaceType">(
  "prefer-named-react-type-imports",
  "namespaceType",
);

const ruleTester = new RuleTester();
ruleTester.run("prefer-named-react-type-imports", rule, {
  valid: [
    'import type { ReactNode } from "react"; type Child = ReactNode;',
    'import * as React from "react"; type Child = React.ReactNode;',
    'import React from "react"; type Props = React.ComponentPropsWithRef<"a">;',
    "namespace Shapes { export type Box = string; } type Box = Shapes.Box;",
  ],
  invalid: [
    {
      code: "type Child = React.ReactNode;",
      errors: [{ messageId: "namespaceType", data: { name: "ReactNode" } }],
    },
    {
      code: 'function Link(props: React.ComponentPropsWithRef<"a">) { return props; }',
      errors: [
        {
          messageId: "namespaceType",
          data: { name: "ComponentPropsWithRef" },
        },
      ],
    },
    {
      code: "const ref: React.RefObject<HTMLElement | null> = { current: null };",
      errors: [{ messageId: "namespaceType", data: { name: "RefObject" } }],
    },
  ],
});
