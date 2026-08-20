import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, test } from "vitest";
import plugin from "./index.ts";

const execFileAsync = promisify(execFile);

const noModuleMockingRule = plugin.rules[
  "no-module-mocking"
] as TSESLint.RuleModule<"moduleMock">;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtureSource = `import { vi } from "vitest";

vi.mock("./dependency", () => ({}));
`;

async function getOxlintOutput(): Promise<string> {
  const testDirectory = await mkdtemp(join(tmpdir(), "utilfirst-oxlint-"));
  const configPath = join(testDirectory, ".oxlintrc.json");
  const sourcePath = join(testDirectory, "fixture.ts");

  const pluginPath = new URL("./index.ts", import.meta.url).pathname;
  await writeFile(
    configPath,
    JSON.stringify({
      jsPlugins: [{ name: "utilfirst", specifier: pluginPath }],
      rules: { "utilfirst/no-module-mocking": "error" },
    }),
  );
  await writeFile(sourcePath, fixtureSource);

  try {
    await execFileAsync(
      "node_modules/.bin/oxlint",
      ["--config", configPath, sourcePath],
      { cwd: process.cwd() },
    );
    return "";
  } catch (error) {
    if (!(error instanceof Error) || !("stdout" in error)) {
      throw error;
    }

    return String(error.stdout);
  } finally {
    await rm(testDirectory, { force: true, recursive: true });
  }
}

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
});

ruleTester.run("no-module-mocking", noModuleMockingRule, {
  valid: ["const value = 1;"],
  invalid: [
    {
      code: fixtureSource,
      errors: [{ messageId: "moduleMock" }],
    },
  ],
});

test("reports module mocking through Oxlint", async () => {
  const output = await getOxlintOutput();
  expect(output).toContain("utilfirst(no-module-mocking)");
  expect(output).toContain("Replace module mocking");
});
