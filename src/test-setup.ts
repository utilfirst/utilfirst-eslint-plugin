import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";

RuleTester.afterAll = afterAll;
// SAFETY: RuleTester ignores Vitest's declaration return values.
RuleTester.describe = describe as (name: string, suite: () => void) => void;
// SAFETY: RuleTester ignores Vitest's declaration return values.
RuleTester.it = it as (name: string, testFunction: () => void) => void;
