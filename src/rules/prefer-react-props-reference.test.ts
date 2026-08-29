import { RuleTester } from "@typescript-eslint/rule-tester";

import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<
  "canonicalName" | "childrenReference" | "destructureLocally" | "nameProps"
>(
  "prefer-react-props-reference",
  "canonicalName",
  "childrenReference",
  "destructureLocally",
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
    "function Button(props: { children: React.ReactNode }) { return <button>{props.children}</button>; }",
    "function Button(props: { tone: string; disabled: boolean }) { const { tone, ...buttonProps } = props; return <button {...buttonProps} data-tone={tone} />; }",
    "function Label(props: { value: string }) { const { value } = props; return <p>{value}{value}{value}</p>; }",
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
    {
      code: "function Button(buttonProps: { disabled: boolean }) { return <button disabled={buttonProps.disabled} />; }",
      errors: [{ messageId: "canonicalName" }],
    },
    {
      code: "function Button(props: { disabled: boolean }) { const { disabled } = props; return <button disabled={disabled} />; }",
      errors: [{ messageId: "destructureLocally" }],
    },
    {
      code: "function Button(props: { disabled: boolean }) { if (props.disabled) { const { disabled } = props; return <button disabled={disabled} />; } return null; }",
      errors: [{ messageId: "destructureLocally" }],
    },
    {
      code: "function Button(props: { tone: string; disabled: boolean }) { const { tone, ...buttonProps } = props; return <button data-tone={tone} />; }",
      errors: [{ messageId: "destructureLocally" }],
    },
    {
      code: "type Props = { children: React.ReactNode }; function Button(props: Props) { return <button />; }",
      errors: [{ messageId: "childrenReference" }],
    },
    {
      code: "interface Props { children: React.ReactNode } function Button(props: Props) { return <button />; }",
      errors: [{ messageId: "childrenReference" }],
    },
    {
      code: "type Props = Props & { children: React.ReactNode }; function Button(props: Props) { return <button />; }",
      errors: [{ messageId: "childrenReference" }],
    },
  ],
});
