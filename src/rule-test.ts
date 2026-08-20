import type { TSESLint } from "@typescript-eslint/utils";
import plugin from "./index.ts";

export function getRuleForTest<
  MessageIds extends string,
  Options extends readonly unknown[] = [],
>(
  ruleName: string,
  ...messageIds: MessageIds[]
): TSESLint.RuleModule<MessageIds, Options> {
  const rule = plugin.rules[ruleName];
  if (rule === undefined) {
    throw new Error(`Rule \`${ruleName}\` is missing from the registry`);
  }

  assertRuleContract<MessageIds, Options>(rule, messageIds);
  return rule;
}

function assertRuleContract<
  MessageIds extends string,
  Options extends readonly unknown[],
>(
  candidateRule: TSESLint.RuleModule<string>,
  messageIds: readonly MessageIds[],
): asserts candidateRule is TSESLint.RuleModule<string> &
  TSESLint.RuleModule<MessageIds, Options> {
  for (const messageId of messageIds) {
    if (!(messageId in candidateRule.meta.messages)) {
      throw new Error(`Rule has an unexpected \`${messageId}\` message`);
    }
  }
}
