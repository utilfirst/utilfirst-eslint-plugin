import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import plugin from "./index.ts";

const execFileAsync = promisify(execFile);

const fixtureSource = `import { vi } from "vitest";

const paragraphStart = createValue();
useValue(paragraphStart);
function createNextValue() {}

type RawValue = unknown;
type Metadata = Record<string, unknown>;
type UserShape = { name: string };

const input: unknown = { name: "Ada" };
const widened: unknown = { name: "Ada" };
const broad: object = { name: "Ada" };
const options = { ...(input === undefined ? {} : { input }) };
const conditionalOptions = {
  input: input === undefined ? undefined : input,
};

enum Status {
  Ready,
}

vi.mock("./dependency", () => ({}));

const chained = input as unknown as string;
const narrowed = widened as { name: string };

function consume(value: object, other: unknown): void {
  if (typeof other === "string") {
    Reflect.get(value, "name");
    Reflect.apply(consume, undefined, [value, other]);
  }
}

function load(): unknown {
  return input;
}

function configure(isEnabled: boolean): void {
  consume(conditionalOptions, isEnabled);
}
`;

const ruleNames = Object.keys(plugin.rules);

async function getOxlintOutput(): Promise<string> {
  const testDirectory = await mkdtemp(join(tmpdir(), "utilfirst-oxlint-"));
  const configPath = join(testDirectory, ".oxlintrc.json");
  const sourcePath = join(testDirectory, "fixture.ts");

  const pluginPath = new URL("./index.ts", import.meta.url).pathname;
  await writeFile(
    configPath,
    JSON.stringify({
      jsPlugins: [{ name: "utilfirst", specifier: pluginPath }],
      rules: Object.fromEntries(
        ruleNames.map((ruleName) => [`utilfirst/${ruleName}`, "error"]),
      ),
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

test("reports every shared rule through Oxlint", async () => {
  const output = await getOxlintOutput();
  for (const ruleName of ruleNames) {
    expect(output).toContain(`utilfirst(${ruleName})`);
  }
});
