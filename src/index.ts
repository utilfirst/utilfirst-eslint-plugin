import type { TSESLint } from "@typescript-eslint/utils";
import { consistentBlankLines } from "./rules/consistent-blank-lines.ts";

const meta = {
  name: "@utilfirst/eslint-plugin",
  version: "0.1.0",
} as const;

const rules = {
  "consistent-blank-lines": consistentBlankLines,
} satisfies Record<string, TSESLint.RuleModule<string>>;

const plugin = {
  meta,
  rules,
  configs: {} as {
    recommended: TSESLint.FlatConfig.Config;
  },
};

plugin.configs.recommended = {
  plugins: { utilfirst: plugin },
  rules: { "utilfirst/consistent-blank-lines": "error" },
};

export default plugin;
