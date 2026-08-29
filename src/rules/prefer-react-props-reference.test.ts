import { RuleTester } from "@typescript-eslint/rule-tester";

import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"nameProps">(
  "prefer-react-props-reference",
  "nameProps",
);

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("prefer-react-props-reference", rule, {
  valid: [
    "function Button(props: { disabled: boolean }) { return <button disabled={props.disabled} />; }",
    "const Button = (props: { disabled: boolean }) => <button disabled={props.disabled} />;",
    "const format = ({ value }: { value: string }) => value;",
  ],
  invalid: [
    {
      code: "function Button({ disabled }: { disabled: boolean }) { return <button disabled={disabled} />; }",
      errors: [{ messageId: "nameProps" }],
    },
    {
      code: "const Button = ({ disabled }: { disabled: boolean }) => <button disabled={disabled} />;",
      errors: [{ messageId: "nameProps" }],
    },
  ],
});
