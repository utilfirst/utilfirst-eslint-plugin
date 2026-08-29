import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import plugin from "./index.ts";

const execFileAsync = promisify(execFile);

// Oxlint process startup approaches Vitest's default timeout under suite load.
const DUAL_RUNTIME_TIMEOUT_MS = 15_000;

const fixtureSource = `import assert from "node:assert/strict";
import { PROFILE } from "limits-package";
import { vi } from "vitest";

const topLevelFunction = () => 1;
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

test("interaction only", () => {
  expect(send).toHaveBeenCalledTimes(2);
});
test("snapshot", () => {
  expect(value).toMatchSnapshot();
});
test("negated throw", () => {
  expect(run).not.toThrow();
});
test("promise settlement only", () => {
  expect(operation).resolves.toBeUndefined();
});
test("truthiness", () => {
  expect(value).toBeTruthy();
});
test("imported constant", () => {
  assert.equal(PROFILE.limit, 3);
});
test("wall clock", () => {
  expect(Date.now()).toBeGreaterThan(0);
});

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

if (input === "a") consume(input, input);
else if (input === "b") consume(input, input);
else if (input === "c") consume(input, input);
else if (input === "d") consume(input, input);

const owner = {
  configure(isEnabled: boolean): void {
    consume(conditionalOptions, isEnabled);
  },
  combine(first: string, second: string, third: string): string {
    return first + second + third;
  },
};

const conditionalView = <main>{!true ? null : <span />}</main>;
const forwardedView = <button type="button" {...props} />;

function PropsView({ label }: { label: string }) {
  return <p>{label}</p>;
}

function HookView() {
  useEffect(sync, []);
  const [open] = useState(false);
  return <p>{open}</p>;
}

void Promise.resolve();

// todo remove after migration
// eslint-disable-next-line no-console
console.log(conditionalView, forwardedView, HookView, PropsView, topLevelFunction(), owner.combine("a", "b", "c"));
`;

const ruleNames = Object.keys(plugin.rules);

async function getOxlintOutput(): Promise<string> {
  const testDirectory = await mkdtemp(join(tmpdir(), "utilfirst-oxlint-"));
  const configPath = join(testDirectory, ".oxlintrc.json");
  const sourcePath = join(testDirectory, "fixture.tsx");

  const pluginPath = new URL("index.ts", import.meta.url).pathname;
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

test(
  "reports every shared rule through Oxlint",
  async () => {
    const output = await getOxlintOutput();
    for (const ruleName of ruleNames) {
      expect(output).toContain(`utilfirst(${ruleName})`);
    }
  },
  DUAL_RUNTIME_TIMEOUT_MS,
);

test(
  "fixes comment boundaries with CRLF through Oxlint",
  async () => {
    const testDirectory = await mkdtemp(
      join(tmpdir(), "utilfirst-oxlint-fix-"),
    );

    const configPath = join(testDirectory, ".oxlintrc.json");
    const sourcePath = join(testDirectory, "fixture.ts");

    const pluginPath = new URL("index.ts", import.meta.url).pathname;
    const source = "const value = 1; // trailing\r\nfunction load() {}\r\n";

    await writeFile(
      configPath,
      JSON.stringify({
        jsPlugins: [{ name: "utilfirst", specifier: pluginPath }],
        rules: { "utilfirst/consistent-blank-lines": "error" },
      }),
    );
    await writeFile(sourcePath, source);

    try {
      await execFileAsync(
        "node_modules/.bin/oxlint",
        ["--config", configPath, "--fix", sourcePath],
        { cwd: process.cwd() },
      );

      await expect(readFile(sourcePath, "utf8")).resolves.toBe(
        "const value = 1; // trailing\r\n\r\nfunction load() {}\r\n",
      );
    } finally {
      await rm(testDirectory, { force: true, recursive: true });
    }
  },
  DUAL_RUNTIME_TIMEOUT_MS,
);
