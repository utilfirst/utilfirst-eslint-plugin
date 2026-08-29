import { RuleTester } from "@typescript-eslint/rule-tester";

import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"propsFirst">(
  "prefer-forwarded-props-order",
  "propsFirst",
);

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("prefer-forwarded-props-order", rule, {
  valid: [
    "const Button = (props) => <button {...props} type='button' />;",
    "const Button = (buttonProps) => <button type='button' {...buttonProps} />;",
  ],
  invalid: [
    {
      code: "const Button = (props) => <button type='button' {...props} />;",
      errors: [{ messageId: "propsFirst" }],
    },
  ],
});
