import { RuleTester } from "@typescript-eslint/rule-tester";

import { getRuleForTest } from "../rule-test.ts";

const rule = getRuleForTest<"hookOrder">("prefer-hook-order", "hookOrder");

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("prefer-hook-order", rule, {
  valid: [
    "function View() { const theme = useContext(Theme); const [open] = useState(false); const label = useMemo(() => String(open), [open]); useEffect(() => log(label), [label]); return <p>{theme}</p>; }",
    "function View() { const value = useFeature(); const [open] = useState(false); return <p>{value}</p>; }",
    "function View() { const initial = useMemo(readInitial, []); const [value] = useState(initial); useEffect(() => log(value), [value]); return <p>{value}</p>; }",
  ],
  invalid: [
    {
      code: "function View() { useEffect(sync, []); const [open] = useState(false); return <p>{open}</p>; }",
      errors: [{ data: { hook: "useState" }, messageId: "hookOrder" }],
    },
    {
      code: "function View() { const value = useMemo(read, []); const theme = useContext(Theme); return <p>{value}</p>; }",
      errors: [{ data: { hook: "useContext" }, messageId: "hookOrder" }],
    },
  ],
});
