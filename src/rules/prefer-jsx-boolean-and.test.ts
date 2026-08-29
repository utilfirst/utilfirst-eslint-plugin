import { RuleTester } from "@typescript-eslint/rule-tester";
import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"explicitPredicate" | "preferAnd">(
  "prefer-jsx-boolean-and",
  "explicitPredicate",
  "preferAnd",
);

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("prefer-jsx-boolean-and", rule, {
  valid: [
    "const View = ({ shown }: { shown: boolean }) => <main>{shown && <p />}</main>;",
    "const View = ({ count }: { count: number }) => <main>{count === 0 && <p />}</main>;",
    'const View = ({ name }: { name: string }) => <main>{name === "" && <p />}</main>;',
    "const View = ({ shown }: { shown?: boolean }) => <main>{shown && <p />}</main>;",
    "const View = ({ value }) => <main>{value && <p />}</main>;",
    "const View = ({ name }: { name: string }) => <main>{name ? <p /> : null}</main>;",
    "const View = ({ name }: { name: string }) => <main>{!name ? null : <p />}</main>;",
  ],
  invalid: [
    {
      code: "const View = ({ shown }: { shown: boolean }) => <main>{shown ? <p /> : null}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "const View = ({ shown }: { shown: boolean }) => <main>{shown && <p />}</main>;",
    },
    {
      code: "const View = ({ shown }: { shown: boolean }) => <main>{!shown ? null : <p />}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "const View = ({ shown }: { shown: boolean }) => <main>{shown && <p />}</main>;",
    },
    {
      code: "const View = ({ shown }: { shown: boolean }) => <main>{(!shown) ? null : <p />}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "const View = ({ shown }: { shown: boolean }) => <main>{shown && <p />}</main>;",
    },
    {
      code: "const View = ({ hidden }: { hidden: boolean }) => <main>{hidden ? null : <p />}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "const View = ({ hidden }: { hidden: boolean }) => <main>{!hidden && <p />}</main>;",
    },
    {
      code: "const View = ({ count }: { count: number }) => <main>{count === 0 ? null : <p />}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "const View = ({ count }: { count: number }) => <main>{!(count === 0) && <p />}</main>;",
    },
    {
      code: "interface Props { shown: boolean } const View = (props: Props) => <main>{props.shown ? <p /> : null}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "interface Props { shown: boolean } const View = (props: Props) => <main>{props.shown && <p />}</main>;",
    },
    {
      code: "const View = ({ shown, other }: { shown: boolean; other: boolean }) => <main>{shown ? (other ? <p /> : <span />) : null}</main>;",
      errors: [{ messageId: "preferAnd" }],
      output:
        "const View = ({ shown, other }: { shown: boolean; other: boolean }) => <main>{shown && (other ? <p /> : <span />)}</main>;",
    },
    {
      code: "type Count = number; const View = ({ count }: { count: Count }) => <main>{count && <p />}</main>;",
      errors: [{ data: { type: "number" }, messageId: "explicitPredicate" }],
    },
    {
      code: "interface Props { name: string } const View = ({ name }: Props) => <main>{name && <p />}</main>;",
      errors: [{ data: { type: "string" }, messageId: "explicitPredicate" }],
    },
    {
      code: "const View = ({ value }: { value: boolean | string }) => <main>{value && <p />}</main>;",
      errors: [
        {
          data: { type: "non-boolean" },
          messageId: "explicitPredicate",
        },
      ],
    },
  ],
});
